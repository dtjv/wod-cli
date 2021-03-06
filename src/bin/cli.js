#!/usr/bin/env node

import { resolve, basename } from 'node:path'
import { read, write } from 'to-vfile'
import { globby } from 'globby'
import { Command, Option } from 'commander/esm.mjs'
import { wod } from '../lib/wod.js'

const program = new Command()

program
  .name('wod')
  .description('A Node CLI to aggregate markdown files into one HTML file.')
  .addOption(
    new Option('-d, --dir <path>', 'Path to client folders').default('.', 'cwd')
  )
  .addOption(
    new Option('-c, --client <folder>', 'Specify a client folder').default(
      '*',
      '*'
    )
  )
  .addOption(
    new Option('-f, --files [file...]', 'List markdown files').default(
      ['*.md'],
      '*.md'
    )
  )
  .addOption(
    new Option('-o, --out <file>', 'Write result to file').default('', 'stdout')
  )
  .helpOption('-h, --help', 'Display help for command')

program.addHelpText(
  'after',
  `
Notes:
  1. '--dir <path>' is relative to current working directory
  2. '--client <folder>' is relative to '--dir'

Examples:
  # Process all folders in 'clients' folder.
  $ wod -d clients

  # Process all files a client folder. Redirect output to a file.
  $ wod -c jon-doe > jon.html

  # Process a file for a client.
  $ wod -c jon-doe -f 2021.01.01.md -o jon.html

  # Process specific files for all clients
  $ wod -f 2021-01-01.md 2021-01-03.md
`
)

program.parse()

const options = program.opts()
const globs = options.files.map((file) =>
  resolve(options.dir, options.client, file)
)
const files = await globby(globs)
const vfiles = await Promise.all(
  files.map(async (file) => await read(file, 'utf8'))
)

// inject filename under h1 of each file
for (const file of vfiles) {
  let [h1, ...rest] = file.value.split('\n\n')
  let fn = basename(file.history[0], '.md')
  file.value = [h1, fn, ...rest].join('\n\n')
}

const vfile = await wod(vfiles)

if (options.out) {
  vfile.path = options.out
  await write(vfile)
} else {
  console.log(vfile.toString())
}
