# 🔑 Service Role Key Setup Instructions

## 📋 Quick Setup Guide

To run the user seed script, you need to add your Supabase service role key to the environment variables.

### Step 1: Get Your Service Role Key

1. **Open Supabase Dashboard**: Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **Select Your Project**: Choose the project with URL `https://udnhkdnbvjzcxooukqrq.supabase.co`
3. **Navigate to Settings**: Click on "Settings" in the left sidebar
4. **Go to API Settings**: Click on "API" in the settings menu
5. **Copy Service Role Key**: Find the "service_role" key (NOT the anon key) and copy it

### Step 2: Update Environment Variables

Replace the placeholder in your `.env` file:

```bash
# Change this line in .env:
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_YOUR_SERVICE_ROLE_KEY

# To this (with your actual key):
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_service_role_key_here...
```

### Step 3: Run the Seed Script

Once you've updated the service role key:

```bash
# Create the seed users
npm run seed:users

# Verify the users were created
npm run verify:users
```

## 🔒 Security Notes

- **Keep the service role key secure** - it has admin privileges
- **Never commit the service role key** to version control
- **Use different keys** for development and production
- **Rotate keys regularly** for security

## 🚨 Important

The service role key is different from the anon key:
- **anon key**: For client-side operations (already in your .env)
- **service_role key**: For admin operations (needed for user creation)

Make sure you copy the **service_role** key, not the anon key!

## 📞 Need Help?

If you can't find the service role key:
1. Make sure you're logged into the correct Supabase account
2. Verify you have admin access to the project
3. Check that the project URL matches: `https://udnhkdnbvjzcxooukqrq.supabase.co`
