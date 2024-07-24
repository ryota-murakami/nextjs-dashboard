import { $ } from 'execa'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('e', {
    alias: 'exclude',
    describe: 'Exclude specific packages from updating',
    type: 'array',
    default: [],
  })
  .help()
  .alias('help', 'h').argv

// Main function to update packages
async function updatePackages() {
  try {
    // Get outdated packages
    const outdated = await $`pnpm outdated --json`
    const outdatedPackages = JSON.parse(outdated)

    // Filter out excluded packages
    const packagesToUpdate = outdatedPackages.filter(
      (pkg) => !argv.exclude.includes(pkg.name),
    )

    // Update each package
    for (const pkg of packagesToUpdate) {
      console.log(`Updating ${pkg.name} from ${pkg.current} to ${pkg.latest}`)
      await $`pnpm add ${pkg.name}@${pkg.latest}`
    }

    console.log('All packages have been updated.')
  } catch (error) {
    console.error('Error updating packages:', error)
  }
}

// Run the update process
updatePackages()
