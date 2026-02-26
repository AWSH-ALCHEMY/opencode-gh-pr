import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import * as github from '@actions/github';
import { SecurePRReview } from './lib/SecurePRReview';
import { ActionConfig } from './lib/ActionConfig';
import { Logger } from './lib/Logger';

/**
 * Main entry point for the Secure PR Review Action
 * Handles initialization, configuration, and execution
 */
async function run(): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Initialize logger
    const logger = new Logger();
    logger.info('🔒 Secure PR Review Action starting...');
    
    // Load and validate configuration
    const config = new ActionConfig();
    
    // Validate required inputs
    const githubToken = core.getInput('github-token', { required: true });
    
    // Initialize GitHub client
    const octokit = new Octokit({ auth: githubToken });
    
    // Get context
    const context = github.context;
    if (!context.payload.pull_request) {
      throw new Error('This action must be run on pull request events');
    }
    
    const pr = context.payload.pull_request;
    logger.info(`Processing PR #${pr.number}: ${pr['title']}`);
    
    // Initialize and run the secure review
    const reviewer = new SecurePRReview({
      octokit,
      config,
      logger,
      repo: context.repo,
    });
    
    const result = await reviewer.execute();
    
    // Set outputs
    core.setOutput('review-status', result.status);
    core.setOutput('review-score', result.score.toString());
    core.setOutput('security-issues', result.securityIssues.toString());
    core.setOutput('performance-issues', result.performanceIssues.toString());
    core.setOutput('files-analyzed', result.filesAnalyzed.toString());
    core.setOutput('execution-time', ((Date.now() - startTime) / 1000).toString());
    
    logger.info(`✅ Review completed: ${result.status} (score: ${result.score}/10)`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Secure PR Review failed: ${errorMessage}`);
    
    // Log detailed error for debugging (sanitized)
    if (error instanceof Error && error.stack) {
      core.debug(`Stack trace: ${error.stack}`);
    }
  }
}

// Execute the action
if (require.main === module) {
  run();
}

export { run };