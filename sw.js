// رصيد — يحفظ نسخة من ملفات التطبيق ليفتح دون إنترنت.
// البيانات نفسها لا تمر من هنا: هي مشفّرة في ذاكرة الجهاز، والمزامنة مع Supabase لا تُخزَّن مؤقتًا.
const CACHE = 'raseed-2026.10.31-2';
const CORE = [
  './', './index.html', './manifest.json', './icon.png', './apple-touch-icon.png',
  './vendor/chart.umd.js', './vendor/supabase.js',
  './fonts/kufi-ar-400.woff2', './fonts/kufi-la-400.woff2',
  './fonts/kufi-ar-700.woff2', './fonts/kufi-la-700.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('raseed-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // Supabase وأي طلب خارجي: دون تخزين
  if (url.pathname.endsWith('/version.json')) return;  // فحص التحديث يذهب للشبكة دائمًا

  // صفحة التطبيق: الشبكة أولًا (لتصل التحديثات فورًا)، والنسخة المحفوظة عند انقطاع الإنترنت
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // الخطوط والمكتبات والأيقونات: من النسخة المحفوظة، ثم الشبكة
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
