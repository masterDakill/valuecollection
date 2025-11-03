# 🔐 Fix eBay OAuth Scopes - 403 Access Denied Error

## 🚨 Current Problem

You're getting **403 Forbidden - Insufficient permissions** when calling the eBay Browse API because your OAuth token doesn't include the required scopes.

**Error Details:**
```json
{
  "errorId": 1100,
  "domain": "ACCESS",
  "category": "REQUEST",
  "message": "Access denied",
  "longMessage": "Insufficient permissions to fulfill the request."
}
```

---

## ✅ Solution: Get Token with Correct Scopes

### **Step 1: Access OAuth Token Generator**

Go to eBay Developer Portal API Explorer:
🔗 https://developer.ebay.com/my/api_test_tool

### **Step 2: Configure OAuth Scopes**

Before generating the token, you need to **select the correct OAuth scopes**:

1. Click on **"Get OAuth User Token"** button
2. You should see a **scope selection interface**
3. **Check/Select these scopes:**

   ✅ **Required for Browse API (Search Items):**
   - `https://api.ebay.com/oauth/api_scope/buy.item.feed`
   - `https://api.ebay.com/oauth/api_scope/buy.marketplace.insights`
   - `https://api.ebay.com/oauth/api_scope` (general read access)

   ✅ **Optional (for future features):**
   - `https://api.ebay.com/oauth/api_scope/sell.marketing.readonly` (for market insights)
   - `https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly` (for product catalog)

### **Step 3: Generate New Token**

1. After selecting scopes, click **"Sign in to Sandbox"**
2. Log in with your **sandbox test user account**
3. **Accept the permissions** on the consent page
4. Copy the generated token (starts with `v^1.1#i^1#f^0#p^3...`)

### **Step 4: Update `.dev.vars`**

Replace the old token in your `.dev.vars` file:

```bash
# eBay OAuth User Token (with correct scopes)
EBAY_USER_TOKEN=v^1.1#i^1#f^0#p^3#I^3#r^1#t^[NEW_TOKEN_HERE]

# Your credentials (keep as is)
EBAY_CLIENT_ID=YOUR_CLIENT_ID_HERE
EBAY_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

### **Step 5: Restart Dev Server**

```bash
cd /home/user/webapp
npm run dev
```

---

## 🧪 Test the Fix

Once you have the new token, test it directly in the API Explorer:

### **Test Query:**
```
GET https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q=drone&limit=3
```

### **Expected Response:**
```json
{
  "total": 1234,
  "limit": 3,
  "itemSummaries": [
    {
      "itemId": "...",
      "title": "DJI Drone...",
      "price": {
        "value": "499.99",
        "currency": "USD"
      },
      ...
    }
  ]
}
```

---

## 📋 Scope Reference Table

| Scope | Purpose | Required For |
|-------|---------|--------------|
| `api_scope` | General read access | All public APIs |
| `buy.item.feed` | Browse item listings | Search/Browse API ✅ |
| `buy.marketplace.insights` | Market pricing data | Price insights |
| `sell.inventory` | Manage listings | Selling features |
| `commerce.catalog.readonly` | Product catalog | Product matching |

---

## 🔧 Alternative: Use Finding API Instead

If you continue having scope issues with the **Browse API**, you can use the older **Finding API** which has fewer restrictions:

### **Finding API Endpoint:**
```
GET https://svcs.sandbox.ebay.com/services/search/FindingService/v1
  ?OPERATION-NAME=findItemsAdvanced
  &SERVICE-VERSION=1.13.0
  &SECURITY-APPNAME=YOUR_CLIENT_ID_HERE
  &RESPONSE-DATA-FORMAT=JSON
  &keywords=drone
  &paginationInput.entriesPerPage=3
```

**Advantages:**
- ✅ No OAuth required (uses App ID only)
- ✅ Works with basic credentials
- ✅ Good for search/price queries

**Disadvantages:**
- ⚠️ Older API (but still maintained)
- ⚠️ Less detailed item data

---

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid OAuth credentials"
**Solution:** Make sure you're using the **Sandbox** environment and **sandbox test user** credentials.

### Issue 2: "Token expired"
**Solution:** Tokens expire after 2 hours. Generate a new one or implement refresh token flow.

### Issue 3: "Scope not found"
**Solution:** Your app might not have the scope enabled. Check your app settings at:
🔗 https://developer.ebay.com/my/keys

### Issue 4: Still getting 403 after adding scopes
**Solution:** 
1. Clear browser cache
2. Log out of eBay Sandbox
3. Generate completely new token
4. Verify scopes in token by decoding it (base64)

---

## 🔐 Understanding Your Token

Your current token structure:
```
v^1.1#i^1#f^0#p^3#I^3#r^1#t^Ul4x...
         ^              ^
         |              |
    flags        scopes indicator
```

- `#r^1` means you have **1 scope** granted
- You need `#r^2` or more for Browse API access

---

## 📞 Need Help?

If you continue experiencing issues:

1. **Check eBay Developer Forums:** https://community.ebay.com/t5/Developer-Program/ct-p/ebay-developer-program
2. **Review API Documentation:** https://developer.ebay.com/api-docs/buy/browse/overview.html
3. **Contact eBay Support:** Through the Developer Program portal

---

## ✅ Verification Checklist

Before testing again, verify:

- [ ] Generated new token with correct scopes selected
- [ ] Updated `.dev.vars` with new token
- [ ] Restarted development server
- [ ] Using correct API endpoint (sandbox vs production)
- [ ] Using correct marketplace ID (EBAY_CA for Canada)

---

**Once you complete these steps, the 403 error should be resolved and your market price integration will work!** 🎉
