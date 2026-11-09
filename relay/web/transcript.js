/** 规整识别文本:压缩空白、trim;非字符串/空 → ''。浏览器与 vitest 共用。 */
export function cleanTranscript(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}
