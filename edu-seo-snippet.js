export const EDU_MARKER = "<!-- edu-seo -->";

export const EDU_HEAD = `
  <meta name="description" content="Scramjet is a free student learning and research portal for homework, independent study, and academic research. Access Harvard OpenCourseWare, MIT Open Learning, Khan Academy, digital libraries, and trusted scholarly resources." />
  <meta name="keywords" content="education, learning, Harvard, university, research, students, academic, study, homework, Khan Academy, MIT, OpenCourseWare, digital library, scholarly resources, college, lecture, coursework, Yale, Stanford, Princeton, curriculum" />
  <meta name="author" content="Scramjet Education" />
  <meta name="subject" content="Education, Higher Education, Academic Research, Digital Learning" />
  <meta name="category" content="education" />
  <meta name="classification" content="Education, Reference, Research" />
  <meta name="audience" content="students, educators, researchers" />
  <meta name="coverage" content="Worldwide" />
  <meta name="distribution" content="global" />
  <meta name="rating" content="general" />
  <meta name="robots" content="index, follow" />
  <meta http-equiv="content-language" content="en-us" />
  <meta name="dc.title" content="Scramjet Student Learning Portal" />
  <meta name="dc.subject" content="Education; Higher education; Academic research; Harvard University; MIT" />
  <meta name="dc.type" content="InteractiveResource" />
  <meta name="dc.language" content="en" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Scramjet" />
  <meta property="og:title" content="Scramjet" />
  <meta property="og:description" content="Free educational portal for students — Harvard lectures, Khan Academy, MIT OpenCourseWare, and academic research tools." />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Scramjet" />
  <meta name="twitter:description" content="Free educational portal for students — Harvard, MIT, Khan Academy, and academic research resources." />
  <link rel="canonical" href="/" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Scramjet",
    "alternateName": "Scramjet Student Learning Portal",
    "description": "Free educational web portal helping students and researchers access Harvard OpenCourseWare, MIT lectures, Khan Academy, digital libraries, and academic resources.",
    "inLanguage": "en-US",
    "audience": {
      "@type": "EducationalAudience",
      "educationalRole": "student"
    },
    "about": [
      { "@type": "CollegeOrUniversity", "name": "Harvard University" },
      { "@type": "CollegeOrUniversity", "name": "Massachusetts Institute of Technology" },
      { "@type": "Organization", "name": "Khan Academy" },
      { "@type": "CollegeOrUniversity", "name": "Yale University" },
      { "@type": "CollegeOrUniversity", "name": "Stanford University" },
      { "@type": "CollegeOrUniversity", "name": "Princeton University" }
    ],
    "keywords": "education, Harvard, MIT, university, research, learning, students, academic study, homework, OpenCourseWare"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Scramjet Learning Initiative",
    "description": "Digital learning platform providing access to university coursework, research databases, and academic study tools for K-12 and higher education students.",
    "knowsAbout": ["Harvard University", "MIT OpenCourseWare", "Khan Academy", "academic research", "digital libraries", "homework help", "exam preparation"],
    "areaServed": "Worldwide"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "name": "Scramjet Academic Research Portal",
    "learningResourceType": "educational website",
    "educationalLevel": "secondary, undergraduate",
    "educationalUse": ["research", "homework", "independent study", "exam preparation"],
    "audience": {
      "@type": "EducationalAudience",
      "educationalRole": "student"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Independent Study & Research Access",
    "description": "Self-directed learning portal with access to Harvard, MIT, and Khan Academy educational materials.",
    "provider": { "@type": "CollegeOrUniversity", "name": "Harvard University" },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": "Self-paced"
    }
  }
  </script>
`;

export const EDU_BODY = `
<noscript>
  <article itemscope itemtype="https://schema.org/EducationalOrganization">
    <h1 itemprop="name">Scramjet Student Learning Portal</h1>
    <p itemprop="description">Free educational website for students and researchers. Access Harvard OpenCourseWare, MIT Open Learning, Khan Academy, Yale Online, Stanford Online, Princeton lectures, digital libraries, JSTOR, Google Scholar, and academic research databases for homework, coursework, exam preparation, and independent study.</p>
    <meta itemprop="keywords" content="education, Harvard, MIT, university, learning, students, academic research, homework, study tools" />
  </article>
</noscript>
<div class="crawler-only" aria-hidden="true" hidden>
  <article itemscope itemtype="https://schema.org/WebSite">
    <h1 itemprop="name">Scramjet — Educational Research Portal</h1>
    <p itemprop="description">Scramjet is an academic learning platform used by students to access trusted higher-education resources including Harvard University OpenCourseWare, Massachusetts Institute of Technology lectures, Khan Academy courses, Yale University online learning, Stanford University research materials, digital libraries, scholarly journals, and curriculum-aligned study tools for homework help and independent research.</p>
    <ul>
      <li>Harvard University course materials and lectures</li>
      <li>MIT OpenCourseWare science and mathematics</li>
      <li>Khan Academy practice and instructional videos</li>
      <li>Academic research databases and digital libraries</li>
      <li>College preparatory study and exam resources</li>
    </ul>
  </article>
</div>
`;

export function injectEduSeo(html) {
  if (!html || html.includes(EDU_MARKER)) return html;
  let output = html.replace("</head>", `${EDU_MARKER}${EDU_HEAD}</head>`);
  output = output.replace(/<body([^>]*)>/i, `<body$1>${EDU_BODY}`);
  return output;
}
