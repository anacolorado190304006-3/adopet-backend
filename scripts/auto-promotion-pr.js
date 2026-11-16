// The only write operation is pulls.create. Reviews and merges remain manual.
module.exports = async function openPromotionPr({ github, context, core }) {
  const targets = new Map([
    ['refs/heads/development', 'staging'],
    ['refs/heads/staging', 'production']
  ]);
  const base = targets.get(context.ref);
  if (context.eventName !== 'push' || context.payload.deleted || !base) {
    core.info('Event ignored: only non-deletion pushes to development/staging are supported.');
    return { status: 'ignored' };
  }

  const head = context.ref.slice('refs/heads/'.length);
  const { owner, repo } = context.repo;
  const findOpen = async () => {
    const { data } = await github.rest.pulls.list({
      owner, repo, state: 'open', head: `${owner}:${head}`, base, per_page: 100
    });
    return data[0]; // Exact same-repository source/target filter, including drafts.
  };

  try {
    const existing = await findOpen();
    if (existing) {
      core.info(`PR #${existing.number} already open for ${head} -> ${base}; no changes made.`);
      return { status: 'existing', number: existing.number };
    }

    const [source, destination] = await Promise.all([
      github.rest.repos.getCommit({ owner, repo, ref: head }),
      github.rest.repos.getCommit({ owner, repo, ref: base })
    ]);
    if (source.data.sha !== context.sha) {
      core.info('A newer push exists; this stale run will not open a PR.');
      return { status: 'stale' };
    }
    if (source.data.commit.tree.sha === destination.data.commit.tree.sha) {
      core.info('Source and destination have identical file trees; no PR needed.');
      return { status: 'identical' };
    }

    const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
      owner, repo, basehead: `${destination.data.sha}...${source.data.sha}`
    });
    if (!Number.isInteger(comparison.ahead_by) || !Array.isArray(comparison.files)) {
      throw new Error('Incomplete comparison response');
    }
    if (comparison.ahead_by <= 0 || comparison.files.length === 0) {
      core.info('No source commits with a real PR diff; no PR needed.');
      return { status: 'no-diff' };
    }

    let created;
    try {
      ({ data: created } = await github.rest.pulls.create({
        owner, repo, head, base, draft: false,
        title: `Promoción revisada: ${head} → ${base}`,
        body: [
          `Promoción propuesta de **${head}** a **${base}**.`,
          '',
          'Este bot solo abre el PR. No aprueba, fusiona ni activa auto-merge.',
          'La creación del PR no acredita una ejecución de Azure Pipelines.',
          '',
          '- [ ] Semgrep aprobado.',
          '- [ ] OWASP Dependency-Check aprobado (CVSS >= 7 bloquea).',
          '- [ ] Pruebas y cobertura >= 70 % por archivo de la HU.',
          '- [ ] Gitleaks aprobado.',
          '- [ ] Check de Azure del SHA vigente y revisión humana aprobados.',
          '',
          'Consultar docs/guia4/09-auto-promotion-pr.md antes de integrar.'
        ].join('\n')
      }));
    } catch (error) {
      // GitHub can reject a duplicate created between our GET and POST.
      if (error.status === 422) {
        const concurrent = await findOpen();
        if (concurrent) {
          core.info(`PR #${concurrent.number} was opened concurrently; no duplicate created.`);
          return { status: 'existing', number: concurrent.number };
        }
      }
      throw error;
    }

    core.info(`Opened PR #${created.number}: ${head} -> ${base}. Await Azure checks and human review.`);
    return { status: 'created', number: created.number };
  } catch (error) {
    const hints = {
      401: 'Check GITHUB_TOKEN availability and repository access.',
      403: 'Check Actions PR creation policy, pull-requests:write and API rate limits.',
      404: 'Check repository access and that both branches exist.',
      422: 'PR creation rejected; inspect current branch differences and rerun after review.',
      429: 'API rate limit reached; rerun later.'
    };
    // Never print the response body, headers, token or raw exception message.
    core.setFailed(`Unable to open promotion PR (HTTP ${Number.isInteger(error.status) ? error.status : 'unknown'}). ${hints[error.status] || 'Inspect API availability and retry the run after review.'}`);
    return { status: 'failed' };
  }
};
