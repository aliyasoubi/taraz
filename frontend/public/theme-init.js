try {
  var t = localStorage.getItem('taraz.theme') || 'dark'
  if (t === 'system') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
} catch (_) {}
