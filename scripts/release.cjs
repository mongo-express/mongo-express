// Called from .github/workflows/publish.yml

const generateReleaseNotes = async ({
  github,
  owner,
  repo,
  versionTag,
  defaultBranch,
}) => {
  const { data: releases } = await github.rest.repos.listReleases({
    owner,
    repo,
  });

  const previousRelease = releases[0];

  const { data: { body } } = await github.rest.repos.generateReleaseNotes({
    owner,
    repo,
    tag_name: versionTag,
    target_commitish: defaultBranch,
    previous_tag_name: previousRelease?.tag_name,
  });

  const bodyWithoutReleasePr = body.split('\n')
    .filter((line) => !line.includes('[Release] v'))
    .join('\n');

  return bodyWithoutReleasePr;
};

const release = async ({
  github,
  context,
  defaultBranch,
  versionTag,
}) => {
  const { owner, repo } = context.repo;
  const releaseNotes = await generateReleaseNotes({
    github,
    owner,
    repo,
    versionTag,
    defaultBranch,
  });

  await github.rest.repos.createRelease({
    owner,
    repo,
    tag_name: versionTag,
    target_commitish: defaultBranch,
    name: versionTag,
    body: releaseNotes,
    draft: false,
    prerelease: false,
    generate_release_notes: false,
  });
};

module.exports = release;
