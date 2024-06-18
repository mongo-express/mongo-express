const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const PM_NOT_YARN = {
  npm: {
    lockFile: 'package-lock.json',
    installCommand: 'npm i --package-lock-only'
  }
}

const TEMPORARY_FOLDER = '.yarn'
const YARN_LOCK_FILE = 'yarn.lock'

const createTmpFolder = () => {
  if (fs.existsSync(TEMPORARY_FOLDER) === false) {
    fs.mkdirSync(TEMPORARY_FOLDER)
  }
}

const moveLock = (fromRootToTmp = true) => {
  for (const pm in PM_NOT_YARN) {
    const { lockFile }= PM_NOT_YARN[pm]
    let oldPath
    let newPath
    if (fromRootToTmp === true) {
      oldPath = lockFile
      newPath = path.join(TEMPORARY_FOLDER, lockFile)
      
    } else {
      oldPath = path.join(TEMPORARY_FOLDER, lockFile)
      newPath = lockFile
    }
    if (fs.existsSync(oldPath) === true) {
      fs.renameSync(oldPath, newPath)
    }
  }
}

const moveYarnLock = (fromRootToTmp = true) => {
  let oldPath
  let newPath
  if (fromRootToTmp === true) {
    oldPath = YARN_LOCK_FILE
    newPath = path.join(TEMPORARY_FOLDER, YARN_LOCK_FILE)
  } else {
    oldPath = path.join(TEMPORARY_FOLDER, YARN_LOCK_FILE)
    newPath = YARN_LOCK_FILE
  }
  if (fs.existsSync(oldPath) === true) {
    fs.renameSync(oldPath, newPath)
  }
}

const installOtherPm = () => {
  for (const pm in PM_NOT_YARN) {
    const { installCommand }= PM_NOT_YARN[pm]
    execSync(installCommand)
  }
}

module.exports = {
  name: 'yarn-plugin-install',
  factory: () => {
    return {
      hooks: {
        validateProject: (_project, _report) => {
          console.log('Before install')
          createTmpFolder()
          moveLock(true)
        },
        afterAllInstalled: (_project, _options) => {
          console.log('After install')
          moveLock(false)
          moveYarnLock(true)
          installOtherPm()
          moveYarnLock(false)
        }
      }
    }
  }
}