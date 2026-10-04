import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

// Deploys the built site to the gh-pages branch of
// github.com/devanshs474-stack/icarus (project site → /icarus/ subpath).
// Uses the git credentials already configured on this machine.

const REPO = 'https://github.com/devanshs474-stack/icarus.git'
const SUBPATH = '/icarus/'
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

// 1. Production build with the Pages subpath baked into asset URLs.
run('npx vite build', {
  env: { ...process.env, BASE_PATH: SUBPATH },
})

// 2. Publish dist/ as the gh-pages branch. dist keeps its own nested git
//    repository (the parent repo ignores dist/), force-pushed every deploy.
if (!existsSync('dist/.git')) {
  run('git init -b gh-pages', { cwd: 'dist' })
  run(`git remote add origin ${REPO}`, { cwd: 'dist' })
}
run('git add -A', { cwd: 'dist' })
run('git commit -m "Deploy built site"', { cwd: 'dist' })
run('git push -f origin gh-pages', { cwd: 'dist' })

console.log('\nPushed gh-pages. If Pages is not enabled yet, run once:')
console.log('  POST /repos/devanshs474-stack/icarus/pages  { "source": { "branch": "gh-pages", "path": "/" } }')
console.log('Live at https://devanshs474-stack.github.io/icarus/')
