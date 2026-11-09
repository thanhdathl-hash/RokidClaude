# Cài đặt một lần trên máy tính: Node, Git, Claude Code, relay, nhận giọng nói tiếng Việt, ngrok.
. "$PSScriptRoot\common.ps1"
$ProgressPreference = 'SilentlyContinue'   # tải nhanh hơn trên PowerShell 5.1

function Ask($q) { (Read-Host "$q (Y/N)") -match '^[Yy]' }
function Has($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + (Join-Path $env:USERPROFILE '.local\bin')
}
function Winget-Install($id, $label) {
  if (-not (Has 'winget')) { Fail "Thiếu $label và máy không có winget. Hãy tự cài $label rồi chạy lại." }
  Say "  Đang cài $label..." 'Cyan'
  winget install --id $id -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
}
function Download($url, $out) {
  Say "  Đang tải $(Split-Path -Leaf $out)..." 'Cyan'
  & curl.exe -L --fail --retry 3 -o $out $url
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $out)) { Fail "Tải thất bại: $url" }
}

Say '=============================================' 'Cyan'
Say '  Rokid Claude - Cài đặt cho Windows' 'Cyan'
Say '=============================================' 'Cyan'
Assert-AsciiRoot
New-Item -ItemType Directory -Force -Path $Tools | Out-Null

# 1) Node.js >= 18
Say "`n[1/8] Node.js"
if (-not (Has 'node')) { Winget-Install 'OpenJS.NodeJS.LTS' 'Node.js' }
if (-not (Has 'node')) { Fail 'Cài Node.js xong nhưng chưa nhận. Đóng cửa sổ, mở lại 1-Cai-dat.bat.' }
$nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 18) { Fail "Node.js quá cũ (v$nodeMajor). Cần bản 18 trở lên." }
Ok "Node $(node -v)"

# 2) Git for Windows (Claude Code trên Windows cần Git Bash)
Say "`n[2/8] Git for Windows"
if (-not (Has 'git')) { Winget-Install 'Git.Git' 'Git for Windows' }
if (Has 'git') { Ok (git --version) } else { Warn 'Chưa nhận Git; nếu Claude Code báo thiếu Git Bash, hãy cài Git rồi chạy lại.' }

# 3) Claude Code
Say "`n[3/8] Claude Code"
Refresh-Path
if (-not ((Test-Path (Join-Path $env:USERPROFILE '.local\bin\claude.exe')) -or (Has 'claude'))) {
  Say '  Cài Claude Code bằng bộ cài chính thức của Anthropic...' 'Cyan'
  Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
  Refresh-Path
}
Set-ClaudeEnv
Ok "Claude Code: $env:CLAUDE_BINARY"

# 4) Thư viện cho relay
Say "`n[4/8] Thư viện relay (npm install)"
Push-Location $Relay
try { & npm install --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { Fail 'npm install lỗi.' } } finally { Pop-Location }
Ok 'Relay sẵn sàng'

# 5) whisper.cpp (nhận giọng nói chạy ngay trên máy, không gửi âm thanh lên mạng)
Say "`n[5/8] Bộ nhận giọng nói whisper.cpp"
$wDir = Join-Path $Tools 'whisper'
if (-not (Test-Path (Join-Path $wDir 'whisper-cli.exe'))) {
  $zip = Join-Path $Tools 'whisper.zip'
  Download 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip' $zip
  $ex = Join-Path $Tools 'whisper-extract'
  Remove-Item $ex -Recurse -Force -ErrorAction SilentlyContinue
  Expand-Archive $zip -DestinationPath $ex -Force
  $cli = Get-ChildItem $ex -Recurse -Filter 'whisper-cli.exe' | Select-Object -First 1
  if (-not $cli) { Fail 'Không thấy whisper-cli.exe trong gói tải về.' }
  Remove-Item $wDir -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item $cli.DirectoryName $wDir
  Remove-Item $ex, $zip -Recurse -Force -ErrorAction SilentlyContinue
}
Ok 'whisper-cli.exe'

# 6) Model giọng nói
Say "`n[6/8] Model nhận giọng nói tiếng Việt"
$models = Join-Path $Relay 'models'
New-Item -ItemType Directory -Force -Path $models | Out-Null
$big = Join-Path $models 'ggml-large-v3-turbo-q5_0.bin'
$small = Join-Path $models 'ggml-small.bin'
if (-not (Test-Path $big) -and -not (Test-Path $small)) {
  Say '  Chọn model:' 'Cyan'
  Say '   1 = large-v3-turbo (~550 MB) - nghe tiếng Việt tốt, cần máy khá (khuyên dùng)'
  Say '   2 = small (~470 MB) - nhẹ hơn nhưng nghe tiếng Việt kém hơn'
  $pick = Read-Host '  Nhập 1 hoặc 2'
  $hf = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/'
  if ($pick -eq '2') { Download ($hf + 'ggml-small.bin') $small }
  else { Download ($hf + 'ggml-large-v3-turbo-q5_0.bin') $big }
}
Ok 'Model đã có'

# 7) ngrok (đường hầm để kính kết nối tới máy từ bất cứ đâu)
Say "`n[7/8] ngrok"
if (-not (Find-Ngrok)) { Winget-Install 'Ngrok.Ngrok' 'ngrok' }
if (Find-Ngrok) { Ok "ngrok: $(Find-Ngrok)" } else { Warn 'Chưa có ngrok. Tải tại https://ngrok.com/download, giải nén ngrok.exe vào thư mục tools.' }

# 8) Tải sẵn file APK (dự phòng; bình thường tải thẳng trên điện thoại rồi cài qua app quản lý Rokid)
Say "`n[8/8] File cài app cho kính (APK)"
$apk = Join-Path $Root 'RokidClaude.apk'
if (-not (Test-Path $apk)) {
  try {
    $rel = Invoke-RestMethod 'https://api.github.com/repos/thanhdathl-hash/RokidClaude/releases/latest' -Headers @{ 'User-Agent' = 'rokid-claude-setup' }
    $asset = $rel.assets | Where-Object { $_.name -like '*.apk' } | Select-Object -First 1
    if ($asset) { Download $asset.browser_download_url $apk }
  } catch { }
}
if (Test-Path $apk) { Ok "Đã tải sẵn: $apk" }
else { Warn 'Không tải sẵn được; hãy tải file .apk trên điện thoại tại github.com/thanhdathl-hash/RokidClaude/releases' }

Say "`n=============================================" 'Green'
Say '  CÀI ĐẶT XONG. Việc còn lại:' 'Green'
Say '  1. Mở Command Prompt, gõ: claude   -> đăng nhập bằng tài khoản Claude Pro, rồi gõ /exit'
Say '  2. Đăng ký ngrok miễn phí, chạy: ngrok config add-authtoken <mã của bạn>'
Say '  3. Cài app Rokid Claude lên kính bằng mục cài APK trong app quản lý Rokid trên điện thoại'
Say '  4. Chạy 2-Chay-hang-ngay.bat, rồi dùng kính quét mã QR hiện trên màn hình'
Say '=============================================' 'Green'
Read-Host 'Nhấn Enter để đóng'
