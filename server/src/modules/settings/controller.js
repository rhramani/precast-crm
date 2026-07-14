const Settings = require('./model');

const defaultLogoBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MDAgMTIwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICA8IS0tIExvZ28gSWNvbjogUG9ydGFsIEZyYW1lIHJlcHJlc2VudGF0aW9uIG9mIFByZWNhc3QgQ29uY3JldGUgc3RydWN0dXJlIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE1LDEwKSI+CiAgICA8IS0tIFNsYWIgMTogSG9yaXpvbnRhbCBiZWFtICh0ZWFsKSAtLT4KICAgIDxwYXRoIGQ9Ik0gMCwyMCBMIDcwLDIwIEwgNzAsMzUgTCAwLDM1IFoiIGZpbGw9IiMwQTdCODQiIHJ4PSIyIiAvPgogICAgPCEtLSBTbGFiIDI6IENvbHVtbiAobWludCkgLS0+CiAgICA8cGF0aCBkPSJNIDE1LDM1IEwgMzAsMzUgTCAzMCw5MCBMIDE1LDkwIFoiIGZpbGw9IiMyREQ0QkYiIHJ4PSIyIiAvPgogICAgPCEtLSBTbGFiIDM6IENvbHVtbiAobWludCkgLS0+CiAgICA8cGF0aCBkPSJNIDQ1LDM1IEwgNjAsMzUgTCAwLDk5IFoiIGZpbGw9IiMyREQ0QkYiIHJ4PSIyIiAvPgogICAgCiAgICA8IS0tIExldHRlciBmb3JtcyBzdHlsaXplZCBpbnRlZ3JhdGlvbiAoR0lSKSAtLT4KICAgIDx0ZXh0IHg9Ijg1IiB5PSI3MCIgZm9udC1mYW1pbHk9IkludGVyLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iNDIiIGZvbnQtd2VpZ2h0PSI4MDAiIGZpbGw9IiMwQTdCODQiPkdJUjwvdGV4dD4KICAgIDx0ZXh0IHg9IjE3NSIgeT0iNzAiIGZvbnQtZmFtaWx5PSJJbnRlciwgc3lzdGVtLXVpLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQyIiBmb250LXdlaWdodD0iMzAwIiBmaWxsPSIjMUUyOTNCIj5QUkVDQVNUPC90ZXh0PgogICAgCiAgICA8IS0tIFN1YnRpdGxlIC0tPgogICAgPHRleHQgeD0iODciIHk9IjkwIiBmb3JtLWZhbWlseT0iSW50ZXIsIHN5c3RlbS11aSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9IjYwMCIgZmlsbD0iIzY0NzQ4QiIgbGV0dGVyLXNwYWNpbmc9IjMiPk1BTlVGQUNUVVJJTkcgQ1JNPC90ZXh0PgogIDwvZz4KPC9zdmc+';

const defaultFaviconBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI0U2RjJGMyIgLz4KICA8IS0tIFBvcnRhbCBGcmFtZSBJY29uIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE1LCAxNSkiPgogICAgPCEtLSBTbGFiIDE6IEhvcml6b250YWwgYmVhbSAodGVhbCkgLS0+CiAgICA8cGF0aCBkPSJNIDAsMTUgTCA3MCwxNSBMIDcwLDMwIEwgMCwzMCBaIiBmaWxsPSIjMEE3Qjg0IiByeD0iMiIgLz4KICAgIDwhLS0gU2xhYiAyOiBDb2x1bW4gKG1pbnQpIC0tPgogICAgPHBhdGggZD0iTSAxNSwzMCBMIDMwLDMwIEwgMzAsNzUgTCAxNSw3NSBaIiBmaWxsPSIjMkRENEJGIiByeD0iMiIgLz4KICAgIDwhLS0gU2xhYiAzOiBDb2x1bW4gKG1pbnQpIC0tPgogICAgPHBhdGggZD0iTSA0NSwzMCBMIDYwLDMwIEwgNjAsNzUgTCA0NSw3NSBaIiBmaWxsPSIjMkRENEJGIiByeD0iMiIgLz4KICBnPgogPC9zdmc+';

// GET /settings
const getSettings = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ 
      companyName: 'GIR Precast', 
      logo: defaultLogoBase64, 
      favicon: defaultFaviconBase64,
      fontFamily: 'Inter'
    });
  } else {
    let needsSave = false;
    if (!settings.logo) {
      settings.logo = defaultLogoBase64;
      needsSave = true;
    }
    if (!settings.favicon) {
      settings.favicon = defaultFaviconBase64;
      needsSave = true;
    }
    if (!settings.fontFamily) {
      settings.fontFamily = 'Inter';
      needsSave = true;
    }
    if (needsSave) {
      await settings.save();
    }
  }
  res.json({ success: true, data: settings });
};

// PUT /settings
const updateSettings = async (req, res) => {
  const { companyName, logo, favicon, fontFamily } = req.body;
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({});
  }
  
  if (companyName !== undefined) settings.companyName = companyName;
  if (logo !== undefined) settings.logo = logo;
  if (favicon !== undefined) settings.favicon = favicon;
  if (fontFamily !== undefined) settings.fontFamily = fontFamily;
  
  await settings.save();
  
  res.json({ success: true, message: 'Settings updated successfully', data: settings });
};

module.exports = {
  getSettings,
  updateSettings,
};
