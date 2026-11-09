#!/bin/bash
# Rokid Claude 一键配网:把眼镜连上一个 WiFi / 手机热点。
# 眼镜没有键盘,无法在面板里输密码,所以用 USB + adb 把凭据带进去一次(之后自动重连)。
# 用法:眼镜用开发线插到 Mac,双击本文件(或终端 ./setup-wifi.command)。
cd "$(dirname "$0")"
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
[ -x "$ADB" ] || ADB="$(command -v adb || true)"
if [ -z "$ADB" ] || [ ! -x "$ADB" ]; then
  echo "✗ 找不到 adb。请装 Android 平台工具(Android Studio 自带,或 brew install android-platform-tools)。"
  read -n 1 -s -r -p "按任意键关闭…"; exit 1
fi

echo "──────────────────────────────"
echo "  Rokid Claude · 眼镜配网"
echo "──────────────────────────────"

# 1) 检查眼镜是否连上
if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "✗ 没检测到眼镜。请确认:① 用的是【开发线】;② 眼镜已开机并插到 Mac;③ USB 调试已打开。"
  read -n 1 -s -r -p "按任意键关闭…"; exit 1
fi
echo "✓ 眼镜已连接"

# 2) 打开眼镜 WiFi(它默认是关的)
"$ADB" shell svc wifi enable >/dev/null 2>&1
echo "✓ 已打开眼镜 WiFi"

# 3) 提示:手机热点要保持唤醒(尤其 iPhone)
echo ""
echo "提示:如果连的是【iPhone 个人热点】,请先在 iPhone 上打开「个人热点」并"
echo "      【停在那个设置页面】——iPhone 热点没设备连时会休眠、拒绝连接。"
echo "      安卓手机热点没有这个问题。"
echo ""

# 4) 输入 SSID / 密码(密码不回显)
read -r -p "要连接的 WiFi 名称(SSID,区分大小写): " SSID
if [ -z "$SSID" ]; then echo "✗ SSID 不能为空"; read -n 1 -s -r -p "按任意键关闭…"; exit 1; fi
read -r -s -p "密码(输入时不显示,按回车确认): " PASS; echo
if [ -z "$PASS" ]; then echo "✗ 密码不能为空"; read -n 1 -s -r -p "按任意键关闭…"; exit 1; fi

# 5) 连接(SSID 用单引号包好以容纳空格;密码不写进我们自己的输出)
echo "▶ 正在让眼镜连接 \"$SSID\" …"
"$ADB" shell "cmd wifi connect-network '$SSID' wpa2 '$PASS'" >/dev/null 2>&1
# 立刻清掉设备日志:cmd wifi 会把密码明文写进 logcat,清掉更干净
"$ADB" shell logcat -c >/dev/null 2>&1
unset PASS

# 6) 等待并验证
echo "  等待连接(约 8 秒)…"
sleep 8
STATUS="$("$ADB" shell cmd wifi status 2>/dev/null | grep -i 'connected to')"
if echo "$STATUS" | grep -qi "$SSID"; then
  IP="$("$ADB" shell ip addr show wlan0 2>/dev/null | grep -o 'inet [0-9.]*' | head -1 | awk '{print $2}')"
  echo "✓ 已连接:$STATUS"
  echo "✓ 眼镜 IP:$IP"
  echo "✓ 配网成功!以后这个网络在范围内会自动重连。"
else
  echo "✗ 暂时没连上。常见原因与对策:"
  echo "   · iPhone 热点休眠 → 在 iPhone 上停在「个人热点」页面后,重跑本脚本"
  echo "   · 密码不对 → 重跑本脚本,仔细输密码"
  echo "   · 信号太弱 → 靠近手机再试"
fi
echo ""
read -n 1 -s -r -p "按任意键关闭…"
