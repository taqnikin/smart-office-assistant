-- Smart Office Assistant - Error Logs Table Migration
-- Creates table for storing application error logs and monitoring data
-- Migration: 004_create_error_logs_table.sql

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL CHECK (category IN (
        'authentication', 'api', 'database', 'network', 'ui', 
        'navigation', 'notification', 'storage', 'validation', 'unknown'
    )),
    message TEXT NOT NULL,
    stack TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_agent TEXT,
    app_version TEXT,
    context JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_timestamp ON error_logs(severity, timestamp DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_category_severity_timestamp 
ON error_logs(category, severity, timestamp DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_error_logs_updated_at
    BEFORE UPDATE ON error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_error_logs_updated_at();

-- Create error statistics view
CREATE OR REPLACE VIEW error_statistics AS
SELECT 
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'high') as high_errors,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_errors,
    COUNT(*) FILTER (WHERE severity = 'low') as low_errors,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_errors,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved_errors,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as errors_last_24h,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as errors_last_7d,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '30 days') as errors_last_30d
FROM error_logs;

-- Create error trends view (daily aggregation)
CREATE OR REPLACE VIEW error_trends AS
SELECT 
    DATE(timestamp) as error_date,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
    COUNT(*) FILTER (WHERE severity = 'low') as low_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT category) as error_categories
FROM error_logs
WHERE timestamp >= NOW() - INTERVAL '90 days'
GROUP BY DATE(timestamp)
ORDER BY error_date DESC;

-- Create error categories summary view
CREATE OR REPLACE VIEW error_categories_summary AS
SELECT 
    category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved_count,
    MAX(timestamp) as last_occurrence,
    COUNT(DISTINCT user_id) as affected_users
FROM error_logs
GROUP BY category
ORDER BY total_count DESC;

-- Create recent critical errors view
CREATE OR REPLACE VIEW recent_critical_errors AS
SELECT 
    id,
    timestamp,
    category,
    message,
    user_id,
    context,
    resolved
FROM error_logs
WHERE severity = 'critical'
    AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 50;

-- Row Level Security (RLS) policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own error logs
CREATE POLICY error_logs_user_access ON error_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Admins can see all error logs
CREATE POLICY error_logs_admin_access ON error_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: System can insert error logs (for service account)
CREATE POLICY error_logs_system_insert ON error_logs
    FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON error_statistics TO authenticated;
GRANT SELECT ON error_trends TO authenticated;
GRANT SELECT ON error_categories_summary TO authenticated;
GRANT SELECT ON recent_critical_errors TO authenticated;

-- Grant admin users full access to error logs
GRANT ALL ON error_logs TO authenticated;

-- Create function to clean up old error logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM error_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days'
    AND resolved = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark error as resolved
CREATE OR REPLACE FUNCTION resolve_error_log(
    error_id TEXT,
    resolver_id UUID DEFAULT auth.uid(),
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE error_logs 
    SET 
        resolved = true,
        resolved_at = NOW(),
        resolved_by = resolver_id,
        resolution_notes = notes,
        updated_at = NOW()
    WHERE id = error_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get error summary for dashboard
CREATE OR REPLACE FUNCTION get_error_dashboard_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_errors', (SELECT total_errors FROM error_statistics),
        'critical_errors', (SELECT critical_errors FROM error_statistics),
        'unresolved_errors', (SELECT unresolved_errors FROM error_statistics),
        'errors_last_24h', (SELECT errors_last_24h FROM error_statistics),
        'top_categories', (
            SELECT json_agg(
                json_build_object(
                    'category', category,
                    'count', total_count,
                    'unresolved', unresolved_count
                )
            )
            FROM (
                SELECT category, total_count, unresolved_count
                FROM error_categories_summary
                ORDER BY total_count DESC
                LIMIT 5
            ) top_cats
        ),
        'recent_critical', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'timestamp', timestamp,
                    'category', category,
                    'message', message,
                    'resolved', resolved
                )
            )
            FROM (
                SELECT id, timestamp, category, message, resolved
                FROM recent_critical_errors
                LIMIT 10
            ) recent
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_error_log(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_error_dashboard_summary() TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE error_logs IS 'Stores application error logs and monitoring data';
COMMENT ON COLUMN error_logs.severity IS 'Error severity level: low, medium, high, critical';
COMMENT ON COLUMN error_logs.category IS 'Error category for classification and filtering';
COMMENT ON COLUMN error_logs.context IS 'Additional context data in JSON format';
COMMENT ON VIEW error_statistics IS 'Aggregated error statistics for monitoring';
COMMENT ON VIEW error_trends IS 'Daily error trends for the last 90 days';
COMMENT ON VIEW error_categories_summary IS 'Error summary grouped by category';
COMMENT ON FUNCTION cleanup_old_error_logs() IS 'Removes resolved error logs older than 90 days';
COMMENT ON FUNCTION resolve_error_log(TEXT, UUID, TEXT) IS 'Marks an error log as resolved';
COMMENT ON FUNCTION get_error_dashboard_summary() IS 'Returns error summary data for admin dashboard';
