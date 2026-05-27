@echo off
echo Installing security and validation packages...
npm install express-rate-limit validator uuid --save
echo.
echo ✅ Installation complete!
echo.
echo Next steps:
echo 1. Apply the rate limiting code to src/routes/auth.js (see PHASE_1_CODE_REVIEW.md)
echo 2. Restart backend with: npm run dev
echo 3. Test auth endpoints with rate limiting
