const SKIPPED_DESTINATIONS = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'footer', 'generator', 'listtable', 'listoverridetable'])

const CONTROL_WORD = /^([a-zA-Z]+)(-?\d+)? ?/

const windows1252 = new TextDecoder('windows-1252')

function decodeByte(hex: string): string {
  return windows1252.decode(Uint8Array.of(parseInt(hex, 16)))
}

export function isRtf(text: string): boolean {
  return text.trimStart().startsWith('{\\rtf')
}

export function rtfToText(rtf: string): string {
  const stack: boolean[] = []
  let skip = false
  let output = ''
  let fallbackSkip = 1
  let index = 0

  while (index < rtf.length) {
    const char = rtf[index]

    if (char === '{') {
      stack.push(skip)
      index++
      continue
    }
    if (char === '}') {
      skip = stack.pop() ?? false
      index++
      continue
    }
    if (char === '\r' || char === '\n') {
      index++
      continue
    }
    if (char !== '\\') {
      if (!skip) output += char
      index++
      continue
    }

    const next = rtf[index + 1]
    if (next === '\\' || next === '{' || next === '}') {
      if (!skip) output += next
      index += 2
      continue
    }
    if (next === "'") {
      if (!skip) output += decodeByte(rtf.slice(index + 2, index + 4))
      index += 4
      continue
    }
    if (next === '*') {
      skip = true
      index += 2
      continue
    }

    const match = CONTROL_WORD.exec(rtf.slice(index + 1, index + 40))
    if (!match) {
      index += 2
      continue
    }

    const [token, word, parameter] = match
    index += 1 + token.length

    if (SKIPPED_DESTINATIONS.has(word)) {
      skip = true
    } else if (word === 'uc' && parameter) {
      fallbackSkip = Number(parameter)
    } else if (!skip) {
      if (word === 'par' || word === 'line') {
        output += '\n'
      } else if (word === 'tab') {
        output += '\t'
      } else if (word === 'u' && parameter) {
        const code = Number(parameter)
        output += String.fromCharCode(code < 0 ? code + 65536 : code)
        for (let skipped = 0; skipped < fallbackSkip && index < rtf.length; skipped++) {
          index += rtf[index] === '\\' && rtf[index + 1] === "'" ? 4 : 1
        }
      }
    }
  }

  return output
}
