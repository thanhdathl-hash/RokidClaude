# Dùng chung cho các script Windows của Rokid Claude (bản tiếng Việt).
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$Root  = Split-Path -Parent $PSScriptRoot
$Relay = Join-Path $Root 'relay'
$Tools = Join-Path $Root 'tools'
$Port  = if ($env:ROKID_PORT) { $env:ROKID_PORT } else { '8787' }

function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Ok($msg)   { Say "  [OK] $msg" 'Green' }
function Warn($msg) { Say "  [!]  $msg" 'Yellow' }
function Fail($msg) { Say "  [X]  $msg" 'Red'; Read-Host 'Nhấn Enter để đóng'; exit 1 }

function Assert-AsciiRoot {
  if ($Root -match '[^\x00-\x7F]' -or $Root -match ' ') {
    Fail "Thư mục '$Root' có dấu tiếng Việt hoặc khoảng trắng. Hãy chép cả thư mục ra C:\RokidClaude rồi chạy lại."
  }
}

function Find-Ngrok {
  $local = Join-Path $Tools 'ngrok.exe'
  if (Test-Path $local) { return $local }
  $cmd = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

# Tìm Claude Code. Bản cài chính thức là claude.exe; bản cài qua npm là claude.cmd
# (không chạy trực tiếp được nếu không qua shell) -> chạy bằng node + cli.js.
function Set-ClaudeEnv {
  $exe = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
  if (-not (Test-Path $exe)) {
    $cmd = Get-Command claude -ErrorAction SilentlyContinue
    if ($cmd) { $exe = $cmd.Source } else { $exe = $null }
  }
  if (-not $exe) { Fail 'Chưa cài Claude Code. Chạy 1-Cai-dat.bat trước.' }
  if ($exe -like '*.exe') {
    $env:CLAUDE_BINARY = $exe
    Remove-Item Env:CLAUDE_PREFIX_ARGS -ErrorAction SilentlyContinue
    return
  }
  $cli = Join-Path (Split-Path $exe) 'node_modules\@anthropic-ai\claude-code\cli.js'
  if (-not (Test-Path $cli)) { Fail "Không tìm thấy cli.js của Claude Code cạnh $exe. Hãy cài bản chính thức: irm https://claude.ai/install.ps1 | iex" }
  $env:CLAUDE_BINARY = (Get-Command node).Source
  $env:CLAUDE_PREFIX_ARGS = '["' + ($cli -replace '\\', '\\') + '"]'
}

function Set-RelayEnv {
  $tmp = Join-Path $Root 'tmp'
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  # whisper.cpp trên Windows dễ lỗi với đường dẫn có dấu -> dùng thư mục tạm không dấu.
  $env:TEMP = $tmp; $env:TMP = $tmp

  $work = Join-Path $Root 'lam-viec'
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $env:ROKID_WORKDIR = $work

  $env:ROKID_SPEECH_LANG = 'vi'
  $env:ROKID_PORT = $Port

  $whisper = Join-Path $Tools 'whisper\whisper-cli.exe'
  if (-not (Test-Path $whisper)) { Fail 'Thiếu whisper-cli.exe. Chạy 1-Cai-dat.bat trước.' }
  $env:WHISPER_BINARY = $whisper

  $models = Join-Path $Relay 'models'
  $model = @('ggml-large-v3-turbo-q5_0.bin', 'ggml-small.bin') |
    ForEach-Object { Join-Path $models $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $model) { Fail 'Thiếu model nhận giọng nói. Chạy 1-Cai-dat.bat trước.' }
  $env:WHISPER_MODEL = $model

  $env:ROKID_SYSTEM_PROMPT = @'
Người dùng đang nói chuyện với bạn qua kính thông minh Rokid có màn hình rất nhỏ, câu hỏi được chuyển từ giọng nói nên có thể sai chính tả, hãy đoán ý hợp lý nhất.
Luôn trả lời bằng tiếng Việt, ngắn gọn (tối đa khoảng 6 dòng ngắn), không dùng bảng hay định dạng markdown phức tạp.
Khi được yêu cầu tạo file (Excel, Word, PDF, báo cáo...), lưu vào thư mục làm việc hiện tại, đặt tên file tiếng Việt không dấu, rồi báo lại tên file trong một dòng.
Người dùng làm việc ở bộ phận bếp của bệnh viện.
Nếu cần Gmail, Lịch, Google Drive, Sheets hay Notion, hãy dùng các connector claude.ai có sẵn (công cụ tên mcp__claude_ai_...); kính sẽ hỏi người dùng cho phép.
'@

  Ok "Thư mục làm việc của Claude: $work"
  Ok "Model giọng nói: $(Split-Path -Leaf $model)"
}

# Giữ máy không ngủ trong lúc relay chạy (tự hết hiệu lực khi đóng cửa sổ).
function Keep-Awake {
  try {
    Add-Type -Namespace Rokid -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);' -ErrorAction SilentlyContinue
    [Rokid.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
    Ok 'Máy sẽ không tự ngủ khi cửa sổ này còn mở'
  } catch { Warn 'Không chặn được chế độ ngủ; hãy tắt Sleep trong cài đặt nguồn.' }
}

function Stop-OldRelay {
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
      $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $p.Id -Force; Warn "Đã tắt relay cũ (PID $($p.Id))" }
    }
  } catch {}
}

function Start-Relay {
  Push-Location $Relay
  try { & npm run dev } finally { Pop-Location }
}
