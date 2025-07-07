# ngrok Netherlands-Only Access Setup

## Quick Start

1. **Install ngrok** (if not already installed):
   ```bash
   sudo apt update && sudo apt install ngrok
   ```

2. **Configure your authtoken**:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
   Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

3. **Run the tunnel**:
   ```bash
   # For free tier (limited features):
   ./test-ngrok-free.sh
   
   # For paid tier (all features):
   ./test-ngrok.sh
   ```

## ⚠️ Free Tier Limitations

ngrok's free tier limits you to **5 Traffic Policy rules**. Our full configuration uses more than 5 rules, so you have two options:

### Option 1: Use Free Tier Configuration
Use `ngrok-config-free.yml` which offers:
- **Netherlands-only**: Geographic restriction + security headers (2 rules)
- **OAuth-only**: Just Google OAuth, no geographic restriction (1 rule)
- **Basic**: No restrictions at all (0 rules)

### Option 2: Upgrade to Paid Tier
The full `ngrok-config.yml` requires a paid plan and includes:
- Geographic restriction (Netherlands-only)
- OAuth authentication
- Rate limiting
- Custom error pages
- Logging
- Security headers

## What This Configuration Does

The `ngrok-config.yml` provides complete protection with:

- **🌍 Geographic Restriction**: Only allows access from the Netherlands
- **🔐 OAuth Authentication**: Requires Google login for Netherlands users
- **⚡ Rate Limiting**: 1000 requests/hour per IP address
- **🎨 Custom Error Page**: Beautiful bilingual error page for blocked users
- **📊 Logging**: Tracks all access attempts
- **🔒 Security Headers**: HSTS, X-Frame-Options, etc.

## Access Flow

```
User → ngrok URL → Geographic Check
                    ↓
        ┌─── Netherlands? ───┐
        │                    │
       NO                   YES
        ↓                    ↓
   Error Page          Google OAuth
   (Bilingual)              ↓
                      Authenticated?
                            ↓
                           YES
                            ↓
                    Rate Limit Check
                            ↓
                    Access Granted → http://10.0.1.243

```

## Testing

- **From Netherlands**: You'll see Google OAuth login
- **From elsewhere**: You'll see the custom error page
- **With VPN**: Test different countries to verify restrictions

## Monitoring

Check the ngrok dashboard at https://dashboard.ngrok.com to see:
- Blocked access attempts by country
- Successful authentications
- Rate limit violations

## Customization

To modify restrictions, edit `ngrok-config.yml`:

- Change OAuth provider: Update `provider: google` to `github`, `microsoft`, etc.
- Adjust rate limits: Modify `rate: "1000r/h"`
- Allow multiple countries: Change the country check expression
- Custom email domains: Add email validation after OAuth

## Troubleshooting

- **"ngrok not found"**: Install ngrok first
- **"Invalid authtoken"**: Run `ngrok config add-authtoken YOUR_TOKEN`
- **"Config not found"**: Ensure `ngrok-config.yml` exists
- **VPN users blocked**: This is expected behavior 