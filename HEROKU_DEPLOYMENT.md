# Heroku Deployment Guide

## Prerequisites
✅ Heroku CLI has been installed
✅ Procfile has been created
✅ Git repository is initialized

## Deployment Steps

### 1. Close and reopen your terminal
The Heroku CLI needs a fresh terminal session to be recognized.

### 2. Navigate to backend directory
```bash
cd "c:\Users\LENOVO\Desktop\reatstate\backend"
```

### 3. Login to Heroku
```bash
heroku login
```
This will open a browser window where you can log in to your Heroku account.

### 4. Create a new Heroku app
```bash
heroku create your-app-name
```
Or let Heroku generate a random name:
```bash
heroku create
```

### 5. Set environment variables
```bash
heroku config:set MONGODB_URI="your_mongodb_connection_string"
heroku config:set JWT_SECRET="your_jwt_secret_key"
heroku config:set CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
heroku config:set CLOUDINARY_API_KEY="your_cloudinary_api_key"
heroku config:set CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
```

### 6. Deploy to Heroku
```bash
git push heroku main
```

If your branch is named differently (e.g., master):
```bash
git push heroku master
```

### 7. Open your app
```bash
heroku open
```

### 8. View logs (if needed)
```bash
heroku logs --tail
```

### 9. Run initial setup commands (if needed)
```bash
heroku run npm run create-admin
heroku run npm run seed-subscriptions
```

## Important Notes

1. **MongoDB Connection**: Make sure your MongoDB URI allows connections from all IP addresses (0.0.0.0/0) for Heroku to connect.

2. **Frontend CORS**: After deployment, add your Heroku app URL to the CORS configuration in server.js:
   ```javascript
   origin: [
     "http://localhost:5173", 
     "https://zameerrealstate.vercel.app",
     "https://your-app-name.herokuapp.com"  // Add this line
   ]
   ```

3. **Environment Variables**: Never commit your .env file to git. All sensitive data should be set using `heroku config:set`.

4. **Scaling**: By default, Heroku gives you one free dyno. You can scale using:
   ```bash
   heroku ps:scale web=1
   ```

## Troubleshooting

- **Check app status**: `heroku ps`
- **View logs**: `heroku logs --tail`
- **Restart app**: `heroku restart`
- **Check config**: `heroku config`

## Your app files are ready!
- ✅ Procfile created
- ✅ Changes committed to git
- ✅ Ready for deployment
