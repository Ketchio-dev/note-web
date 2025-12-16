export interface Template {
    id: string;
    name: string;
    description: string;
    category: 'work' | 'personal' | 'productivity' | 'engineering';
    icon: string;
    content: string;
    tags: string[];
}

export const TEMPLATES: Template[] = [
    {
        id: 'project-dashboard',
        name: 'Project Dashboard',
        description: 'Comprehensive project tracking with metrics and status',
        category: 'work',
        icon: '📊',
        content: `<h1>📊 Project Dashboard: {{title}}</h1>
<p><strong>Last Updated:</strong> {{date}}</p>
<hr>

<h2>📈 Key Metrics</h2>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Target</th>
      <th>Current</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Completion</td>
      <td>100%</td>
      <td>75%</td>
      <td>🟡 On Track</td>
    </tr>
    <tr>
      <td>Budget</td>
      <td>$50k</td>
      <td>$38k</td>
      <td>🟢 Under Budget</td>
    </tr>
    <tr>
      <td>Timeline</td>
      <td>8 weeks</td>
      <td>Week 6</td>
      <td>🟢 On Schedule</td>
    </tr>
  </tbody>
</table>

<h2>🎯 This Week's Priorities</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Complete feature X implementation</p></li>
  <li data-type="taskItem" data-checked="false"><p>Review and merge pending PRs</p></li>
  <li data-type="taskItem" data-checked="false"><p>Stakeholder demo preparation</p></li>
</ul>

<h2>🚨 Blockers & Risks</h2>
<ul>
  <li><mark>None currently</mark></li>
</ul>

<h2>📅 Next Milestones</h2>
<ol>
  <li><strong>Phase 2 Kickoff</strong> - Next Monday</li>
  <li><strong>Beta Release</strong> - 2 weeks</li>
  <li><strong>GA Launch</strong> - 4 weeks</li>
</ol>`,
        tags: ['project', 'dashboard', 'tracking', 'metrics']
    },
    {
        id: 'sprint-planning',
        name: 'Sprint Planning',
        description: 'Agile sprint planning with backlog and capacity',
        category: 'work',
        icon: '🏃',
        content: `<h1>🏃 Sprint {{title}}</h1>
<p><strong>Sprint Goal:</strong> <em>Enter sprint goal here</em></p>
<p><strong>Duration:</strong> {{date}} - 2 weeks</p>
<hr>

<h2>🎯 Sprint Goal</h2>
<blockquote>
  <p>Primary objective for this sprint</p>
</blockquote>

<h2>👥 Team Capacity</h2>
<table>
  <thead>
    <tr>
      <th>Team Member</th>
      <th>Capacity</th>
      <th>Allocated</th>
      <th>Available</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Engineer 1</td>
      <td>40h</td>
      <td>32h</td>
      <td>8h</td>
    </tr>
    <tr>
      <td>Engineer 2</td>
      <td>40h</td>
      <td>28h</td>
      <td>12h</td>
    </tr>
  </tbody>
</table>

<h2>📋 Sprint Backlog</h2>
<h3>🔴 High Priority</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>[FEAT-123]</strong> User authentication</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>[BUG-456]</strong> Fix payment flow</p></li>
</ul>

<h3>🟡 Medium Priority</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>[FEAT-124]</strong> Dashboard analytics</p></li>
</ul>

<h3>🟢 Nice to Have</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>[TECH-789]</strong> Code refactoring</p></li>
</ul>

<h2>🎲 Daily Standup Notes</h2>
<p><strong>Monday:</strong></p>
<p><strong>Tuesday:</strong></p>
<p><strong>Wednesday:</strong></p>`,
        tags: ['sprint', 'agile', 'planning', 'scrum']
    },
    {
        id: 'okr-template',
        name: 'OKR Tracker',
        description: 'Objectives and Key Results framework',
        category: 'work',
        icon: '🎯',
        content: `<h1>🎯 OKRs - Q{{title}}</h1>
<p><strong>Quarter:</strong> {{date}}</p>
<p><strong>Owner:</strong> Team/Individual</p>
<hr>

<h2>🎯 Objective 1: [Strategic Goal]</h2>
<blockquote>
  <p>What do we want to achieve and why?</p>
</blockquote>

<h3>Key Results</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>KR1:</strong> Increase metric X from 100 to 150 (0% → Target: 50%)</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>KR2:</strong> Launch feature Y by end of quarter (0% → Target: 100%)</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>KR3:</strong> Achieve Z satisfaction score of 4.5/5 (0% → Target: 90%)</p></li>
</ul>

<h3>Progress Check-ins</h3>
<table>
  <thead>
    <tr>
      <th>Week</th>
      <th>KR1</th>
      <th>KR2</th>
      <th>KR3</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Week 1</td>
      <td>10%</td>
      <td>5%</td>
      <td>15%</td>
      <td>Good start</td>
    </tr>
    <tr>
      <td>Week 2</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

<hr>

<h2>🎯 Objective 2: [Strategic Goal]</h2>
<blockquote>
  <p>What do we want to achieve and why?</p>
</blockquote>

<h3>Key Results</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>KR1:</strong> </p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>KR2:</strong> </p></li>
</ul>`,
        tags: ['okr', 'goals', 'objectives', 'strategy']
    },
    {
        id: 'research-note',
        name: 'Research Notes',
        description: 'Academic/technical research documentation',
        category: 'personal',
        icon: '🔬',
        content: `<h1>🔬 Research: {{title}}</h1>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Researcher:</strong> </p>
<hr>

<h2>📋 Research Question</h2>
<blockquote>
  <p>What are we trying to find out?</p>
</blockquote>

<h2>📚 Literature Review</h2>
<table>
  <thead>
    <tr>
      <th>Reference</th>
      <th>Author</th>
      <th>Year</th>
      <th>Key Finding</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Paper 1]</td>
      <td>Smith et al.</td>
      <td>2023</td>
      <td>Main conclusion</td>
    </tr>
    <tr>
      <td>[Paper 2]</td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

<h2>🔍 Methodology</h2>
<ol>
  <li>Data collection approach</li>
  <li>Analysis methods</li>
  <li>Tools & techniques</li>
</ol>

<h2>📊 Findings</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Finding 1: <mark>Significant result</mark></p></li>
  <li data-type="taskItem" data-checked="false"><p>Finding 2: </p></li>
</ul>

<h2>💡 Insights & Implications</h2>
<p></p>

<h2>🚀 Next Steps</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Further investigation needed in area X</p></li>
  <li data-type="taskItem" data-checked="false"><p>Validate hypothesis Y</p></li>
</ul>`,
        tags: ['research', 'academic', 'science', 'study']
    },
    {
        id: 'class-notes',
        name: 'Class Notes',
        description: 'Structured lecture/class notes',
        category: 'personal',
        icon: '🎓',
        content: `<h1>🎓 {{title}}</h1>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Instructor:</strong> </p>
<p><strong>Topic:</strong> </p>
<hr>

<h2>📝 Key Concepts</h2>
<ul>
  <li><strong>Concept 1:</strong> <mark>Definition and importance</mark></li>
  <li><strong>Concept 2:</strong> </li>
</ul>

<h2>📚 Lecture Outline</h2>
<h3>Part 1: Introduction</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Overview of topic</p></li>
  <li data-type="taskItem" data-checked="true"><p>Historical context</p></li>
</ul>

<h3>Part 2: Main Content</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Core theory</p></li>
  <li data-type="taskItem" data-checked="false"><p>Examples & applications</p></li>
</ul>

<h2>💡 Important Formulas/Code</h2>
<pre><code>// Example code or formula
function example() {
  return "Important concept";
}</code></pre>

<h2>❓ Questions to Review</h2>
<ol>
  <li>How does X relate to Y?</li>
  <li>What are the implications of Z?</li>
</ol>

<h2>📚 Homework/Assignments</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Problem set 1 - Due next week</p></li>
  <li data-type="taskItem" data-checked="false"><p>Reading: Chapter 5</p></li>
</ul>

<h2>🔗 Resources</h2>
<ul>
  <li>Textbook: Chapter X</li>
  <li>Online resource: </li>
</ul>`,
        tags: ['education', 'class', 'lecture', 'study']
    },
    {
        id: 'product-spec',
        name: 'Product Spec',
        description: 'Product requirements document (PRD)',
        category: 'engineering',
        icon: '📱',
        content: `<h1>📱 Product Spec: {{title}}</h1>
<p><strong>Author:</strong> </p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Status:</strong> <mark>Draft</mark></p>
<hr>

<h2>🎯 Problem Statement</h2>
<blockquote>
  <p>What problem are we solving and who is it for?</p>
</blockquote>

<h2>👥 Target Users</h2>
<table>
  <thead>
    <tr>
      <th>User Type</th>
      <th>Needs</th>
      <th>Pain Points</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Primary Users</td>
      <td>Quick access</td>
      <td>Current solution is slow</td>
    </tr>
    <tr>
      <td>Secondary Users</td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

<h2>✨ Proposed Solution</h2>
<p><strong>Overview:</strong> Brief description</p>

<h3>Key Features</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>Feature 1:</strong> User can do X</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>Feature 2:</strong> System will Y</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>Feature 3:</strong> Integration with Z</p></li>
</ul>

<h2>🎨 User Flow</h2>
<ol>
  <li>User lands on screen A</li>
  <li>User clicks button B</li>
  <li>System shows result C</li>
</ol>

<h2>📊 Success Metrics</h2>
<ul>
  <li><strong>Adoption:</strong> 80% of users activate feature within 1 month</li>
  <li><strong>Engagement:</strong> Average 5 uses per week</li>
  <li><strong>Satisfaction:</strong> NPS score > 40</li>
</ul>

<h2>⚠️ Out of Scope</h2>
<ul>
  <li>Feature X (deferred to v2)</li>
  <li>Integration Y (separate project)</li>
</ul>

<h2>🚀 Launch Plan</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Alpha release - Week 1</p></li>
  <li data-type="taskItem" data-checked="false"><p>Beta with 100 users - Week 3</p></li>
  <li data-type="taskItem" data-checked="false"><p>GA Launch - Week 6</p></li>
</ul>`,
        tags: ['product', 'spec', 'prd', 'requirements']
    },
    {
        id: 'design-review',
        name: 'Design Review',
        description: 'Technical design document',
        category: 'engineering',
        icon: '🏗️',
        content: `<h1>🏗️ Design Review: {{title}}</h1>
<p><strong>Author:</strong> </p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Reviewers:</strong> </p>
<hr>

<h2>📋 Overview</h2>
<p><strong>Goal:</strong> What we're building</p>
<p><strong>Context:</strong> Why we're building it</p>

<h2>🎯 Requirements</h2>
<table>
  <thead>
    <tr>
      <th>Requirement</th>
      <th>Priority</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Support 1M users</td>
      <td>🔴 Critical</td>
      <td>✅ Met</td>
    </tr>
    <tr>
      <td>Sub-100ms latency</td>
      <td>🟡 Important</td>
      <td>🔄 In Progress</td>
    </tr>
  </tbody>
</table>

<h2>🏗️ Proposed Architecture</h2>
<pre><code>┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼──────┐
│  API Layer  │
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │
└─────────────┘</code></pre>

<h2>🔧 Technical Decisions</h2>
<h3>Decision 1: Technology Stack</h3>
<ul>
  <li><strong>Choice:</strong> React + Node.js</li>
  <li><strong>Rationale:</strong> Team expertise, ecosystem</li>
  <li><strong>Alternatives considered:</strong> Vue, Angular</li>
</ul>

<h3>Decision 2: Database</h3>
<ul>
  <li><strong>Choice:</strong> PostgreSQL</li>
  <li><strong>Rationale:</strong> ACID compliance needed</li>
</ul>

<h2>⚠️ Risks & Mitigation</h2>
<table>
  <thead>
    <tr>
      <th>Risk</th>
      <th>Impact</th>
      <th>Mitigation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Database scalability</td>
      <td>High</td>
      <td>Implement sharding in Phase 2</td>
    </tr>
  </tbody>
</table>

<h2>✅ Review Checklist</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Security reviewed</p></li>
  <li data-type="taskItem" data-checked="false"><p>Performance tested</p></li>
  <li data-type="taskItem" data-checked="false"><p>Scalability validated</p></li>
  <li data-type="taskItem" data-checked="false"><p>Monitoring plan in place</p></li>
</ul>`,
        tags: ['design', 'architecture', 'technical', 'engineering']
    },
    {
        id: 'bug-report',
        name: 'Bug Report',
        description: 'Detailed bug documentation',
        category: 'engineering',
        icon: '🐛',
        content: `<h1>🐛 Bug Report: {{title}}</h1>
<p><strong>Reporter:</strong> </p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Severity:</strong> <mark>High/Medium/Low</mark></p>
<p><strong>Status:</strong> Open</p>
<hr>

<h2>📝 Description</h2>
<p>Brief summary of the bug</p>

<h2>🔍 Steps to Reproduce</h2>
<ol>
  <li>Go to page X</li>
  <li>Click button Y</li>
  <li>Observe error Z</li>
</ol>

<h2>📺 Expected vs Actual Behavior</h2>
<table>
  <thead>
    <tr>
      <th>Expected</th>
      <th>Actual</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Button should work</td>
      <td>Error message appears</td>
    </tr>
  </tbody>
</table>

<h2>🖥️ Environment</h2>
<ul>
  <li><strong>OS:</strong> macOS 14.0</li>
  <li><strong>Browser:</strong> Chrome 120</li>
  <li><strong>Version:</strong> v1.2.3</li>
</ul>

<h2>📸 Screenshots/Logs</h2>
<pre><code>Error: Cannot read property 'x' of undefined
  at Component.render (app.js:123)
  at ...</code></pre>

<h2>💡 Possible Cause</h2>
<p>Initial hypothesis about what might be causing this</p>

<h2>🔧 Fix Plan</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Investigate root cause</p></li>
  <li data-type="taskItem" data-checked="false"><p>Implement fix</p></li>
  <li data-type="taskItem" data-checked="false"><p>Add regression test</p></li>
  <li data-type="taskItem" data-checked="false"><p>Deploy to production</p></li>
</ul>

<h2>🔗 Related Issues</h2>
<ul>
  <li>#123 - Similar error in different context</li>
</ul>`,
        tags: ['bug', 'issue', 'debugging', 'engineering']
    },
    {
        id: 'daily-standup',
        name: 'Daily Standup',
        description: 'Quick daily team sync',
        category: 'work',
        icon: '☀️',
        content: `<h1>☀️ Daily Standup - {{date}}</h1>
<hr>

<h2>👤 Team Member 1</h2>
<p><strong>✅ Yesterday:</strong></p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Completed feature X</p></li>
  <li data-type="taskItem" data-checked="true"><p>Fixed bug #123</p></li>
</ul>

<p><strong>🎯 Today:</strong></p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Start feature Y</p></li>
  <li data-type="taskItem" data-checked="false"><p>Code review for PR #45</p></li>
</ul>

<p><strong>🚧 Blockers:</strong></p>
<ul>
  <li><mark>None</mark></li>
</ul>

<hr>

<h2>👤 Team Member 2</h2>
<p><strong>✅ Yesterday:</strong></p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p></p></li>
</ul>

<p><strong>🎯 Today:</strong></p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p></p></li>
</ul>

<p><strong>🚧 Blockers:</strong></p>
<ul>
  <li></li>
</ul>

<hr>

<h2>📌 Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Follow up on blocker X</p></li>
</ul>`,
        tags: ['standup', 'daily', 'team', 'agile']
    },
    {
        id: 'customer-feedback',
        name: 'Customer Feedback',
        description: 'Track and analyze user feedback',
        category: 'work',
        icon: '💬',
        content: `<h1>💬 Customer Feedback - {{date}}</h1>
<p><strong>Source:</strong> Support ticket / Survey / Interview</p>
<hr>

<h2>👤 Customer Info</h2>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Customer ID</td>
      <td></td>
    </tr>
    <tr>
      <td>Segment</td>
      <td>Enterprise / SMB / Individual</td>
    </tr>
    <tr>
      <td>Usage Level</td>
      <td>Heavy / Medium / Light</td>
    </tr>
  </tbody>
</table>

<h2>📝 Feedback Summary</h2>
<blockquote>
  <p>"Direct quote from customer if applicable"</p>
</blockquote>

<p><strong>Key Points:</strong></p>
<ul>
  <li><mark>Main pain point or request</mark></li>
  <li>Secondary concern</li>
</ul>

<h2>😊 Sentiment Analysis</h2>
<p><strong>Overall:</strong> 😊 Positive / 😐 Neutral / 😞 Negative</p>
<p><strong>NPS Score:</strong> Promoter / Passive / Detractor</p>

<h2>🎯 Feature Requests</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p><strong>Priority 1:</strong> Feature X</p></li>
  <li data-type="taskItem" data-checked="false"><p><strong>Priority 2:</strong> Improvement Y</p></li>
</ul>

<h2>🐛 Bugs Reported</h2>
<ol>
  <li>Issue with Z - <mark>Critical</mark></li>
</ol>

<h2>💡 Insights</h2>
<p>What this tells us about product/market fit</p>

<h2>✅ Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Follow up with customer within 2 days</p></li>
  <li data-type="taskItem" data-checked="false"><p>Add feature request to backlog</p></li>
  <li data-type="taskItem" data-checked="false"><p>File bug ticket</p></li>
</ul>`,
        tags: ['feedback', 'customer', 'product', 'insights']
    },
    {
        id: 'weekly-goals',
        name: 'Weekly Goals',
        description: 'Personal productivity & goal tracking',
        category: 'personal',
        icon: '🎯',
        content: `<h1>🎯 Week of {{date}}</h1>
<hr>

<h2>🌟 Top 3 Priorities</h2>
<ol>
  <li><mark>Most important goal this week</mark></li>
  <li>Second priority</li>
  <li>Third priority</li>
</ol>

<h2>💼 Work Goals</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Complete project deliverable X</p></li>
  <li data-type="taskItem" data-checked="false"><p>Have conversation with manager about Y</p></li>
  <li data-type="taskItem" data-checked="false"><p>Review team's PRs</p></li>
</ul>

<h2>📚 Learning & Development</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Complete course module 3</p></li>
  <li data-type="taskItem" data-checked="false"><p>Read 2 chapters of book X</p></li>
</ul>

<h2>🏃 Health & Wellness</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Exercise 3x this week</p></li>
  <li data-type="taskItem" data-checked="false"><p>Meal prep on Sunday</p></li>
  <li data-type="taskItem" data-checked="false"><p>Get 7+ hours sleep each night</p></li>
</ul>

<h2>🎨 Personal Projects</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Work on side project for 5 hours</p></li>
</ul>

<h2>✅ End of Week Review</h2>
<p><strong>What went well:</strong></p>
<ul>
  <li></li>
</ul>

<p><strong>What could improve:</strong></p>
<ul>
  <li></li>
</ul>

<p><strong>Win of the week:</strong></p>
<blockquote>
  <p>Biggest achievement</p>
</blockquote>`,
        tags: ['goals', 'personal', 'weekly', 'productivity']
    },
    {
        id: 'decision-matrix',
        name: 'Decision Matrix',
        description: 'Structured decision-making framework',
        category: 'productivity',
        icon: '⚖️',
        content: `<h1>⚖️ Decision: {{title}}</h1>
<p><strong>Decision Date:</strong> {{date}}</p>
<p><strong>Decision Maker:</strong> </p>
<p><strong>Deadline:</strong> </p>
<hr>

<h2>🎯 Decision Statement</h2>
<blockquote>
  <p>What exactly are we deciding?</p>
</blockquote>

<h2>📊 Options Comparison</h2>
<table>
  <thead>
    <tr>
      <th>Criteria</th>
      <th>Weight</th>
      <th>Option A</th>
      <th>Option B</th>
      <th>Option C</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cost</td>
      <td>40%</td>
      <td>8/10</td>
      <td>6/10</td>
      <td>5/10</td>
    </tr>
    <tr>
      <td>Time</td>
      <td>30%</td>
      <td>5/10</td>
      <td>9/10</td>
      <td>7/10</td>
    </tr>
    <tr>
      <td>Quality</td>
      <td>30%</td>
      <td>9/10</td>
      <td>7/10</td>
      <td>8/10</td>
    </tr>
    <tr>
      <td><strong>Total</strong></td>
      <td></td>
      <td><mark>7.5</mark></td>
      <td>7.1</td>
      <td>6.4</td>
    </tr>
  </tbody>
</table>

<h2>✅ Pros & Cons Analysis</h2>
<h3>Option A (Recommended)</h3>
<p><strong>Pros:</strong></p>
<ul>
  <li>Best quality outcome</li>
  <li>Lower cost</li>
</ul>

<p><strong>Cons:</strong></p>
<ul>
  <li>Takes more time</li>
</ul>

<h2>🎯 Final Decision</h2>
<blockquote>
  <p><mark>We will proceed with Option A because...</mark></p>
</blockquote>

<h2>📅 Implementation Plan</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><p>Step 1: Communicate decision to stakeholders</p></li>
  <li data-type="taskItem" data-checked="false"><p>Step 2: </p></li>
  <li data-type="taskItem" data-checked="false"><p>Step 3: </p></li>
</ul>`,
        tags: ['decision', 'framework', 'analysis', 'productivity']
    }
];

// Helper function to render template with variables
export function renderTemplate(
    template: Template,
    variables: Record<string, string> = {}
): string {
    let content = template.content;

    // Default variables
    const defaults = {
        date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        title: 'Untitled'
    };

    const allVars = { ...defaults, ...variables };

    // Replace all {{variable}}
    Object.entries(allVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
    });

    return content;
}

// Get templates by category
export function getTemplatesByCategory(category: Template['category']): Template[] {
    return TEMPLATES.filter(t => t.category === category);
}

// Search templates
export function searchTemplates(query: string): Template[] {
    const lowerQuery = query.toLowerCase();
    return TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}
