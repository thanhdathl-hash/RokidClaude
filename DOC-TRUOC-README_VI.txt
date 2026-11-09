ROKID CLAUDE - BẢN WINDOWS, NGHE TIẾNG VIỆT
============================================

Bản chỉnh từ dự án mã nguồn mở Rokid Claude (github.com/williamlzz/Rokid_Claude, giấy phép MIT).
Nói vào kính Rokid Glasses -> máy tính Windows chạy Claude Code -> kết quả hiện lên kính.
Không cần cáp USB.

QUAN TRỌNG: giải nén cả thư mục ra C:\RokidClaude (đường dẫn không dấu, không khoảng trắng).

CÀI ĐẶT (một lần)
1. Trên máy tính: chạy 1-Cai-dat.bat. Nó cài Node.js, Git, Claude Code,
   bộ nghe giọng nói tiếng Việt và ngrok.
2. Mở Command Prompt, gõ: claude  -> đăng nhập tài khoản Claude Pro -> gõ /exit.
3. Đăng ký ngrok miễn phí tại ngrok.com, rồi chạy: ngrok config add-authtoken <mã của bạn>
   Nên lấy thêm "static domain" miễn phí trong trang ngrok và điền vào relay\.remote.env
   (dòng NGROK_DOMAIN=) để chỉ phải quét QR một lần.
   (File relay\.remote.env được tạo ở lần chạy 2-Chay-hang-ngay.bat đầu tiên.)
4. Trên điện thoại: tải file .apk mới nhất tại github.com/thanhdathl-hash/RokidClaude/releases/latest
   (file RokidClaude-vi.apk; bản 0.1.0 ở dự án gốc quá cũ, không quét QR được)
   (hoặc dùng file RokidClaude.apk bộ cài đã tải sẵn trong thư mục này),
   rồi cài lên kính bằng mục cài APK trong app quản lý Rokid.

HẰNG NGÀY
- Chạy 2-Chay-hang-ngay.bat trên máy tính, giữ cửa sổ mở. Mã QR sẽ hiện ra.
- Lần đầu (hoặc khi địa chỉ đổi): mở app Rokid Claude trên kính; khi báo mất kết nối,
  chạm 1 lần vào gọng kính để mở trình quét, rồi nhìn vào mã QR.
- Kính cần có internet: wifi hoặc điểm phát wifi từ điện thoại. Nói "wifi" để mở cài đặt mạng.

TRÊN KÍNH
- Chạm để nói, chạm lần nữa để ngắt. Giao diện kính bằng tiếng Anh, nhưng bạn nói tiếng Việt.
- Lệnh nói: "phiên mới" (bắt đầu lại), "thoát", "đổi model", "chi phí", "tóm tắt", "tiếp tục".
- Khi Claude muốn ghi/sửa file hay chạy lệnh, kính hỏi: Cho phép 1 lần / Luôn cho loại này / Từ chối.

FILE CLAUDE TẠO RA nằm trong thư mục: C:\RokidClaude\lam-viec

BẢO MẬT
- relay\.remote.env và MA-QR-CHO-KINH.html chứa mật khẩu kết nối. Không gửi cho ai.
- Không để dữ liệu bệnh nhân trong thư mục lam-viec.
- Muốn đổi mật khẩu: xóa relay\.remote.env, chạy lại 2-Chay-hang-ngay.bat và quét QR mới.

Biến môi trường mới (cho người rành kỹ thuật): ROKID_SPEECH_LANG=vi, WHISPER_BINARY,
WHISPER_MODEL, ROKID_WORKDIR, ROKID_SYSTEM_PROMPT, CLAUDE_PREFIX_ARGS. Xem windows\common.ps1.
