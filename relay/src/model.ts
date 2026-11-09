import { type Lang, speechVi } from './i18n';

export type ModelAlias = 'opus' | 'sonnet' | 'haiku';
export type ModelCommand = { kind: 'pick' } | null;

const HAS_MODEL = /模型/;
// 切换类动词(normalize 已把繁体「換」归一成「换」)。"什么模型"这类提问不含切换动词 → 不触发,正常发给 claude。
const SWITCH_HINT = /(切换|更换|换|改|选择|选)/;
const EN_HAS_MODEL = /\bmodel\b/i;
const EN_SWITCH = /\b(switch|change|select|pick|set)\b/i;
const VI_HAS_MODEL = /(model|mô hình|mo hinh|mô-đen|mô đen)/i;
const VI_SWITCH = /(đổi|doi|chuyển|chuyen|thay|chọn|chon)/i;

/** 去首尾标点空格;繁体「換」归一成简体「换」(whisper 常输出繁体)。 */
function normalize(s: string): string {
  return s.trim().replace(/^[。,，!！.\s]+|[。,，!！.\s]+$/g, '').replace(/換/g, '换').trim();
}

/**
 * 只识别"切模型意图" → 开选择框(语音不再解析具体英文型号名:whisper 对 opus/sonnet/haiku 听不准)。
 * 命中条件:句中同时含「模型」与切换类动词,如「切换模型」「换个模型」「选模型」。
 * 仅含「模型」无切换动词(如「你现在是什么模型」)→ null,照常发给 claude。
 */
export function parseModelCommand(text: string, lang: Lang = 'zh'): ModelCommand {
  const t = normalize(text);
  if (lang === 'en') {
    if (EN_HAS_MODEL.test(t) && EN_SWITCH.test(t)) return { kind: 'pick' };
    if (speechVi() && VI_HAS_MODEL.test(t) && VI_SWITCH.test(t)) return { kind: 'pick' };
    return null;
  }
  if (HAS_MODEL.test(t) && SWITCH_HINT.test(t)) return { kind: 'pick' };
  return null;
}

/** 别名 → claude --model 参数。opus/sonnet/haiku 都是 Claude Code 标准别名,直接透传(抗版本漂移)。 */
export function modelArg(model: ModelAlias): string {
  return model;
}
