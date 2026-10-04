# Receive login emails in a Google Sheet (free)

1. Go to https://sheets.google.com and create a **Blank** spreadsheet. Name it `Office Quest Visitors`.
2. In row 1 type the headings: `Time`, `Email`, `Name`, `Device`.
3. Menu: **Extensions → Apps Script**. Delete everything in the editor and paste:

```js
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var d = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), d.email, d.name, d.device]);
  return ContentService.createTextOutput('ok');
}
```
4. Click **Save** (disk icon), then **Deploy → New deployment**.
5. Click the gear next to "Select type" → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, approve the permissions (Advanced → Go to project → Allow).
7. Copy the **Web app URL** (starts with `https://script.google.com/macros/s/...`).
8. Paste it into `src/config.js`:  `export const EMAIL_ENDPOINT = 'PASTE_URL_HERE';`
9. Rebuild/redeploy the game. Each new login adds a row to your sheet.

Privacy: the login screen already tells visitors the email is only used so you
know who played. Keep it that way, and don't share the sheet.
