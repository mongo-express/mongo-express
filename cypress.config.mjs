import { defineConfig } from 'cypress'
import cypressCodeCoverageTask from '@cypress/code-coverage/task.js'
import cypressCodeCoverageUseBabel from '@cypress/code-coverage/use-babelrc.js'

export default defineConfig({
  // setupNodeEvents can be defined in either
  // the e2e or component configuration
  e2e: {
    setupNodeEvents(on, config) {
      cypressCodeCoverageTask(on, config)
      // tell Cypress to use .babelrc file
      // and instrument the specs files
      // only the extra application files will be instrumented
      // not the spec files themselves
      on('file:preprocessor', cypressCodeCoverageUseBabel)
      
      return config
    }
  }
})
