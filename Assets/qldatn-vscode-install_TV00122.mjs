/**
 * QLDATN Project Tracker - Bộ Cài Đặt Cho Visual Studio Code
 * -------------------------------------------------------------
 * Chạy script này trong thư mục gốc của dự án:
 *   node <tên-file>.mjs
 *
 * Script sẽ:
 * 1. Tự động tạo file cấu hình workspace .vscode/settings.json
 * 2. Cài đặt cấu hình liên kết tự động và kích hoạt Anti-AFK
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const root = process.cwd()

// Tự động thêm file bộ cài vào .gitignore
const gitignorePath = path.join(root, '.gitignore')
const ignoreRules = ['qldatn-vscode-install_*.mjs', 'qldatn-vscode-install_*.ps1']
const currentIgnore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : ''
const currentRules = new Set(currentIgnore.split(/\r?\n/))
const missingRules = ignoreRules.filter((rule) => !currentRules.has(rule))
if (missingRules.length > 0) {
  fs.appendFileSync(
    gitignorePath,
    (currentIgnore.endsWith('\n') || !currentIgnore ? '' : '\n') + missingRules.join('\n') + '\n'
  )
  console.log('🛡️ [QLDATN] Đã tự động thêm file bộ cài đặt vào .gitignore')
}

const vscodeDir = path.join(root, '.vscode')
if (!fs.existsSync(vscodeDir)) {
  fs.mkdirSync(vscodeDir, { recursive: true })
}

function parseJsonc(text, fallback = {}) {
  if (!text || typeof text !== 'string') return fallback
  try {
    let out = ''
    let inString = false
    let inSingleComment = false
    let inMultiComment = false
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      const next = text[i + 1]
      if (inString) {
        out += c
        if (c === '\\') {
          out += next || ''
          i++
        } else if (c === '"') {
          inString = false
        }
      } else if (inSingleComment) {
        if (c === '\n' || c === '\r') {
          inSingleComment = false
          out += c
        }
      } else if (inMultiComment) {
        if (c === '*' && next === '/') {
          inMultiComment = false
          i++
        }
      } else if (c === '"') {
        inString = true
        out += c
      } else if (c === '/' && next === '/') {
        inSingleComment = true
        i++
      } else if (c === '/' && next === '*') {
        inMultiComment = true
        i++
      } else {
        out += c
      }
    }
    const cleaned = out.replace(/,(\s*[}\]])/g, '$1')
    return JSON.parse(cleaned)
  } catch {
    try {
      return JSON.parse(text)
    } catch {
      return fallback
    }
  }
}

const settingsPath = path.join(vscodeDir, 'settings.json')
let settings = {}
if (fs.existsSync(settingsPath)) {
  settings = parseJsonc(fs.readFileSync(settingsPath, 'utf8'), {})
}

// Cấu hình VS Code workspace
settings['qldatn.trackerUrl'] = "https://datn.unifolio.io.vn"
settings['qldatn.enrollmentCode'] = "qlde_5JniIeyhbsflM5u4xmJiWlO2a08SR6Img1beY2ZktXE"
settings['qldatn.heartbeatIntervalSeconds'] = 30
settings['qldatn.idleTimeoutMinutes'] = 3

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8')

// Thêm khuyến nghị extension trong extensions.json
const extensionsPath = path.join(vscodeDir, 'extensions.json')
let extensionsConfig = { recommendations: [] }
if (fs.existsSync(extensionsPath)) {
  extensionsConfig = parseJsonc(fs.readFileSync(extensionsPath, 'utf8'), { recommendations: [] })
}
if (!Array.isArray(extensionsConfig.recommendations)) {
  extensionsConfig.recommendations = []
}
extensionsConfig.recommendations = extensionsConfig.recommendations.filter(
  (id) => id !== 'fpoly-qldatn.qldatn-tracker'
)
if (!extensionsConfig.recommendations.includes('qldatn.qldatn-tracker')) {
  extensionsConfig.recommendations.push('qldatn.qldatn-tracker')
}
fs.writeFileSync(extensionsPath, JSON.stringify(extensionsConfig, null, 2) + '\n', 'utf8')

// Tự động cài đặt extension vào thư mục ~/.vscode/extensions (và Cursor / VS Code Insiders nếu có)
async function installExtensionFiles() {
  try {
    const userHome = os.homedir()
    const candidateDirs = [
      path.join(userHome, '.vscode', 'extensions'),
      path.join(userHome, '.vscode-insiders', 'extensions'),
      path.join(userHome, '.cursor', 'extensions'),
      path.join(userHome, '.windsurf', 'extensions'),
      path.join(userHome, '.vscode-oss', 'extensions'),
    ]
    const targetDirs = candidateDirs.filter((d) => fs.existsSync(path.dirname(d)))
    if (targetDirs.length === 0) {
      targetDirs.push(candidateDirs[0])
    }

    const manifest = {
      name: 'qldatn-tracker',
      displayName: 'QLDATN Project Tracker',
      description: 'Theo dõi tiến độ phát triển dự án tốt nghiệp tự động cho VS Code (QLDATN)',
      version: '1.0.0',
      publisher: 'qldatn',
      engines: { vscode: '^1.80.0' },
      main: './extension.js',
      activationEvents: ['onStartupFinished'],
      contributes: {
        commands: [
          { command: 'qldatn.enroll', title: 'QLDATN: Kích hoạt / Liên kết mã theo dõi', category: 'QLDATN' },
          { command: 'qldatn.status', title: 'QLDATN: Kiểm tra trạng thái Tracker', category: 'QLDATN' },
          { command: 'qldatn.toggle', title: 'QLDATN: Bật / Tắt tạm thời ghi nhận', category: 'QLDATN' },
          { command: 'qldatn.sync', title: 'QLDATN: Đồng bộ tiến độ ngay lập tức', category: 'QLDATN' },
          { command: 'qldatn.openDashboard', title: 'QLDATN: Mở trang tổng quan dự án', category: 'QLDATN' },
        ],
        keybindings: [
          { command: 'qldatn.sync', key: 'alt+shift+s', mac: 'cmd+alt+s' },
          { command: 'qldatn.openDashboard', key: 'alt+shift+d', mac: 'cmd+alt+d' },
        ],
        configuration: {
          title: 'QLDATN Project Tracker',
          properties: {
            'qldatn.trackerUrl': { type: 'string', default: '', description: 'URL máy chủ QLDATN' },
            'qldatn.enrollmentCode': { type: 'string', default: '', description: 'Mã kích hoạt đăng ký thiết bị' },
            'qldatn.idleTimeoutMinutes': { type: 'number', default: 3, description: 'Thời gian phát hiện treo máy (Anti-AFK)' },
            'qldatn.heartbeatIntervalSeconds': { type: 'number', default: 30, description: 'Chu kỳ gửi tín hiệu theo dõi (giây)' },
          },
        },
      },
    }

    const artifactUrl = "https://datn.unifolio.io.vn" + '/api/project-tracker/client-artifact?platform=VS_CODE'
    let extensionSource = ''
    if (typeof fetch === 'function') {
      const res = await fetch(artifactUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error('Tải extension không thành công (mã ' + res.status + ')')
      extensionSource = await res.text()
    } else {
      extensionSource = await new Promise((resolve, reject) => {
        const client = artifactUrl.startsWith('https') ? https : http
        client.get(artifactUrl, (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error('Tải extension không thành công (mã ' + res.statusCode + ')'))
          }
          let body = ''
          res.setEncoding('utf8')
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => resolve(body))
        }).on('error', reject)
      })
    }

    for (const userExtensionsDir of targetDirs) {
      // Dọn dẹp phiên bản cũ fpoly-qldatn nếu có để tránh trùng lặp extension trong VS Code
      const oldExtDir = path.join(userExtensionsDir, 'fpoly-qldatn.qldatn-tracker-1.0.0')
      if (fs.existsSync(oldExtDir)) {
        try {
          fs.rmSync(oldExtDir, { recursive: true, force: true })
        } catch {}
      }

      const extDir = path.join(userExtensionsDir, 'qldatn.qldatn-tracker-1.0.0')
      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true })
      }
      fs.writeFileSync(path.join(extDir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
      fs.writeFileSync(path.join(extDir, 'extension.js'), extensionSource, 'utf8')
    }
    console.log('📦 [QLDATN] Đã tự động cài đặt Extension vào VS Code!')
  } catch (err) {
    console.warn('⚠️ [QLDATN] Không thể tự cài extension vào VS Code: ' + err.message)
  }
}
await installExtensionFiles()

console.log('\n✅ [QLDATN] Đã cấu hình workspace VS Code thành công tại .vscode/settings.json!')
console.log('📌 Mã liên kết của bạn: ' + "qlde_5JniIeyhbsflM5u4xmJiWlO2a08SR6Img1beY2ZktXE")
console.log('🚀 Mở VS Code trong thư mục này, extension QLDATN Tracker sẽ tự động kích hoạt.')
console.log('💡 Tính năng Anti-AFK (Phát hiện treo máy) đã được bật mặc định sau 3 phút không thao tác.\n')

try {
  const installerPath = fileURLToPath(import.meta.url)
  fs.unlinkSync(installerPath)
  console.log('🗑️ [QLDATN] File cài đặt dùng một lần đã được tự động dọn dẹp.\n')
} catch {}
