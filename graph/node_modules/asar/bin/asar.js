#!/usr/bin/env node
var asar = require('../lib/asar')
var program = require('commander')

program.version('v' + require('../package.json').version)
       .description('Manipulate asar archive files')

program.command('pack <dir> <output>')
       .alias('p')
       .description('create asar archive')
       .option('--ordering <file path>', 'path to a text file for ordering contents')
       .option('--unpack <expression>', 'do not pack files matching glob <expression>')
       .option('--unpack-dir <expression>', 'do not pack dirs matching glob <expression> or starting with literal <expression>')
       .option('--snapshot', 'create snapshot')
       .option('--exclude-hidden', 'exclude hidden files')
       .option('--sv <version>', '(snapshot) version of Electron')
       .option('--sa <arch>', '(snapshot) arch of Electron')
       .option('--sb <builddir>', '(snapshot) where to put downloaded files')
       .action(function (dir, output, options) {
         options = {
           unpack: options.unpack,
           unpackDir: options.unpackDir,
           snapshot: options.snapshot,
           ordering: options.ordering,
           version: options.sv,
           arch: options.sa,
           builddir: options.sb,
           dot: !options.excludeHidden
         }
         asar.createPackageWithOptions(dir, output, options, function (error) {
           if (error) {
             console.error(error.stack)
             process.exit(1)
           }
         })
       })

program.command('list <archive>')
       .alias('l')
       .description('list files of asar archive')
       .action(function (archive) {
         var files = asar.listPackage(archive)
         for (var i in files) {
           console.log(files[i])
         }
       })

program.command('extract-file <archive> <filename>')
       .alias('ef')
       .description('extract one file from archive')
       .action(function (archive, filename) {
         require('fs').writeFileSync(require('path').basename(filename),
                                     asar.extractFile(archive, filename))
       })

program.command('extract <archive> <dest>')
       .alias('e')
       .description('extract archive')
       .action(function (archive, dest) {
         asar.extractAll(archive, dest)
       })

program.command('*')
       .action(function (cmd) {
         console.log('asar: \'%s\' is not an asar command. See \'asar --help\'.', cmd)
       })

program.parse(process.argv)

if (program.args.length === 0) {
  program.help()
}
