# Chạy để dùng kính ở bất cứ đâu (bệnh viện, ngoài đường): relay có mật khẩu + đường hầm ngrok.
. "$PSScriptRoot\common.ps1"
Say '=============================================' 'Cyan'
Say '  Rokid Claude - Dùng từ xa (ngrok)' 'Cyan'
Say '=============================================' 'Cyan'
Assert-AsciiRoot

$ngrok = Find-Ngrok
if (-not $ngrok) { Fail 'Chưa có ngrok. Chạy 1-Cai-dat.bat hoặc tải ngrok.exe vào thư mục tools.' }

# Mật khẩu kết nối (tạo ngẫu nhiên lần đầu, lưu ở relay\.remote.env)
$envFile = Join-Path $Relay '.remote.env'
if (-not (Test-Path $envFile)) {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $tok = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  @(
    '# Tu dong tao. GIU BI MAT: ai co ma nay la dieu khien duoc Claude tren may ban.',
    "ROKID_TOKEN=$tok",
    '# Ten mien co dinh mien phi cua ngrok (vd: ten-ban.ngrok-free.app). De trong = moi lan chay mot dia chi moi.',
    'NGROK_DOMAIN=',
    '# (Tuy chon) Ma API Groq de nhan giong noi nhanh tren cloud. De trong = nhan giong noi tren may.',
    'GROQ_API_KEY='
  ) | Set-Content -Encoding ascii $envFile
  Ok 'Đã tạo mật khẩu kết nối mới'
}
$conf = @{}
foreach ($line in (Get-Content $envFile)) {
  if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $conf[$Matches[1]] = $Matches[2].Trim() }
}
if (-not $conf['ROKID_TOKEN']) { Fail "ROKID_TOKEN trống trong $envFile" }
$env:ROKID_TOKEN = $conf['ROKID_TOKEN']
$domain = $conf['NGROK_DOMAIN']
if ($conf['GROQ_API_KEY']) {
  $env:GROQ_API_KEY = $conf['GROQ_API_KEY']
  Ok 'Nhận giọng nói: Groq (cloud, nhanh). Lỗi mạng sẽ tự chuyển về máy.'
} else {
  Remove-Item Env:GROQ_API_KEY -ErrorAction SilentlyContinue
}

Set-ClaudeEnv
Set-RelayEnv
Stop-OldRelay
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Mở đường hầm ngrok
$log = Join-Path $Root 'tmp\ngrok.log'
$ngArgs = @('http', $Port, '--log=stdout')
if ($domain) { $ngArgs += "--url=$domain"; Say "  Dùng tên miền cố định: $domain" }
$ng = Start-Process -FilePath $ngrok -ArgumentList $ngArgs -RedirectStandardOutput $log -WindowStyle Hidden -PassThru

$publicUrl = $null
for ($i = 0; $i -lt 30 -and -not $publicUrl; $i++) {
  Start-Sleep -Seconds 1
  if ($ng.HasExited) { break }
  try {
    $t = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels'
    $publicUrl = ($t.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url
  } catch {}
}
if (-not $publicUrl) {
  Say (Get-Content $log -Tail 30 -ErrorAction SilentlyContinue | Out-String) 'DarkGray'
  Fail 'ngrok không mở được. Thường do chưa chạy: ngrok config add-authtoken <mã của bạn>'
}
$wsUrl = $publicUrl -replace '^https:', 'wss:'
Ok "Địa chỉ từ xa: $wsUrl"

# Mã QR để kính tự nhận cấu hình (lang=en: giao diện kính tiếng Anh, relay nghe tiếng Việt)
$qrTxt = Join-Path $Root 'tmp\qr.txt'
$qrHtml = Join-Path $Root 'MA-QR-CHO-KINH.html'
"RCLAUDE:url=$wsUrl;token=$($env:ROKID_TOKEN);lang=en" | Set-Content -Encoding ascii $qrTxt
& node (Join-Path $Relay 'tools\make-qr.mjs') $qrTxt $qrHtml | Out-Null
Remove-Item $qrTxt -Force
if (Test-Path $qrHtml) {
  Start-Process $qrHtml
  if ($domain) { Ok 'Đã mở mã QR. Tên miền cố định: chỉ cần quét 1 lần đầu.' }
  else { Ok 'Đã mở mã QR. Không có tên miền cố định: mỗi lần chạy lại phải quét lại.' }
}

Keep-Awake
Say "`nĐang khởi động... Khi thấy 'relay started' là sẵn sàng." 'Cyan'
Say 'Dùng xong: bấm Ctrl+C trong cửa sổ này.' 'Cyan'
try { Start-Relay }
finally { if (-not $ng.HasExited) { Stop-Process -Id $ng.Id -Force -ErrorAction SilentlyContinue } }
