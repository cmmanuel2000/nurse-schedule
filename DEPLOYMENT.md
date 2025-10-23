# 🚀 Vercel Deployment Guide

## Prerequisites

1. ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
2. ✅ MongoDB Atlas account (for cloud database)
3. ✅ GitHub repository (already set up)

---

## Step 1: Set up MongoDB Atlas (Cloud Database)

Since Vercel is serverless, you need a cloud database:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Create a **FREE cluster** (M0 Sandbox)
4. Click **"Connect"** → **"Connect your application"**
5. Copy your connection string (it looks like):
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/nurseDB?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. Save this connection string for later

---

## Step 2: Push Your Code to GitHub

```powershell
# Add the new files
git add .

# Commit the changes
git commit -m "Add Vercel deployment configuration"

# Push to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/nurse-schedule.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. **Import** your GitHub repository (`nurse-schedule`)
4. Vercel will auto-detect the settings
5. Click **"Environment Variables"** and add:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string
   - Click **"Add"**
6. Click **"Deploy"**
7. Wait 1-2 minutes ⏳
8. Your app will be live at: `https://nurse-schedule-xxxxx.vercel.app`

### Option B: Deploy via Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - What's your project's name? nurse-schedule
# - In which directory is your code located? ./
# - Want to override the settings? N

# Add environment variable
vercel env add MONGODB_URI
# Paste your MongoDB Atlas connection string
# Select: Production, Preview, Development (all)

# Deploy to production
vercel --prod
```

---

## Step 4: Configure Environment Variables (Important!)

After deployment, add the environment variable:

1. Go to your project dashboard on Vercel
2. Click **"Settings"** → **"Environment Variables"**
3. Add:
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/nurseDB`
4. Click **"Save"**
5. **Redeploy** the project (it will automatically redeploy)

---

## Step 5: Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test the features:
   - ✅ Add staff
   - ✅ Request days off
   - ✅ Generate schedule
   - ✅ View schedule

---

## 🔧 Troubleshooting

### Issue: "MongoDB connection error"
**Solution**: Make sure:
- Your MongoDB Atlas IP whitelist includes `0.0.0.0/0` (allow all)
- Your connection string is correct in Vercel environment variables
- Your database user has read/write permissions

### Issue: "Cannot GET /"
**Solution**: 
- Check that `vercel.json` is in the root directory
- Redeploy the project

### Issue: API routes not working
**Solution**:
- Make sure routes start with `/api/`
- Check Vercel function logs in the dashboard

---

## 📝 Files Created for Deployment

- ✅ `vercel.json` - Vercel configuration
- ✅ `.vercelignore` - Files to ignore during deployment
- ✅ Updated `package.json` - Added engine requirements
- ✅ Updated `server.js` - Environment variables support

---

## 🎉 Success!

Your app is now live and accessible from anywhere! 

**Your Vercel URL**: `https://nurse-schedule-xxxxx.vercel.app`

### Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow DNS configuration instructions

---

## 🔄 Future Updates

To update your deployed app:

```powershell
# Make changes to your code
git add .
git commit -m "Your update message"
git push

# Vercel automatically redeploys! 🚀
```

---

## 💡 Pro Tips

1. **Environment Variables**: Never commit `.env` to Git
2. **MongoDB Atlas**: Use the FREE tier for testing
3. **Auto-Deploy**: Every push to `main` triggers a deploy
4. **Preview URLs**: Every branch gets a preview URL
5. **Logs**: Check Vercel dashboard for errors

---

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- GitHub Issues: Open an issue in your repo
