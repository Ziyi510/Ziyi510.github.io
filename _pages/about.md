---
layout: homepage
permalink: /
title: "Homepage"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

<section id="biography" class="home-section" aria-labelledby="biography-title" markdown="1">

# <span aria-hidden="true">👨🏻‍🎓</span> Biography
{: #biography-title}

I am currently a master’s student in Computer Engineering at the **National University of Singapore (NUS)**, where I am a member of the [**SHOW Lab**](https://sites.google.com/view/showlab), supervised by Prof. Mike Zheng Shou and working closely with [**Anno Yanzhe Chen**](https://chenanno.github.io/).
{: .intro__masters}

Prior to this, I obtained my bachelor's degree with **Highest Distinction** in Electrical & Electronic Engineering (EEE) at<br>
**Nanyang Technological University (NTU)**, where I worked with [Prof. Lihui Chen](https://dr.ntu.edu.sg/entities/person/Chen-Lihui).

My research interests lie in **large language models, AI agents, and embodied agents**.

In Spring 2025, I spent a semester on exchange at **Virginia Tech**.<br>
In Summer 2025, I was a research intern at **Rice University**.

Please see my [CV]({{ '/files/CV.pdf' | relative_url }}) for more details.

</section>

<section id="news" class="home-section" aria-labelledby="news-title" markdown="1">

# <span aria-hidden="true">🔥</span> News
{: #news-title}

<div class="news-card">
  <time datetime="2026-09">Sep. 2026</time>
  <p>New <a href="https://github.com/showlab/Awesome-Multimodal-Embodied-Agent">[Survey]</a> on multimodal embodied agents: from computer-use to robot-use.</p>
</div>

</section>

<section id="publications" class="home-section" aria-labelledby="publications-title" markdown="1">

# <span aria-hidden="true">📝</span> Publications
{: #publications-title}

## <span aria-hidden="true">⭐</span> Selected Publications

{% assign publications = site.publications | sort: 'date' | reverse %}
{% for paper in publications %}
{% if paper.selected %}
<article class="pub-card">
  <div class="pub-thumb">
    <img src="{{ paper.image | relative_url }}" alt="{{ paper.image_alt }}" loading="lazy">
  </div>
  <div class="pub-info">
    <h3 class="pub-title">{{ paper.title }}</h3>
    <p class="authors">{{ paper.authors_display | default: paper.authors | replace: 'Ziyi Yang', '<strong>Ziyi Yang</strong>' }}</p>
    <p class="venue preprint">{{ paper.venue }}</p>
    <p class="pub-summary">{{ paper.summary }}</p>
    <div class="pub-links">
      <a href="{{ paper.projecturl }}">Website</a>
      <a href="{{ paper.paperurl }}">Paper</a>
      <a href="{{ paper.codeurl }}">GitHub</a>
    </div>
  </div>
</article>
{% endif %}
{% endfor %}

## <span aria-hidden="true">📚</span> All Publications

{% include publication-list.html %}

</section>

<section id="education" class="home-section" aria-labelledby="education-title" markdown="1">

# <span aria-hidden="true">🏫</span> Education
{: #education-title}

<article class="edu-card">
  <img class="edu-logo" src="{{ '/images/logo-nus.png' | relative_url }}" alt="" width="64" height="64" loading="lazy">
  <div class="edu-body">
    <div class="edu-row"><h3>National University of Singapore</h3><span class="edu-date">Aug. 2026 – Present</span></div>
    <p>Master of Science in Computer Engineering</p>
    <p class="edu-detail">Expected graduation: Dec. 2027</p>
  </div>
</article>

<article class="edu-card">
  <img class="edu-logo" src="{{ '/images/logo-ntu.svg' | relative_url }}" alt="Nanyang Technological University logo" width="64" height="64" loading="lazy">
  <div class="edu-body">
    <div class="edu-row"><h3>Nanyang Technological University</h3><span class="edu-date">Jul. 2023 – Jun. 2026</span></div>
    <p>Bachelor of Engineering in Electrical &amp; Electronic Engineering</p>
    <p class="edu-detail">Honours (Highest Distinction) · Data Analysis &amp; Machine Learning</p>
  </div>
</article>

<article class="edu-card">
  <img class="edu-logo" src="{{ '/images/logo-vt.png' | relative_url }}" alt="Virginia Tech logo" width="64" height="64" loading="lazy">
  <div class="edu-body">
    <div class="edu-row"><h3>Virginia Tech</h3><span class="edu-date">Jan. 2025 – May 2025</span></div>
    <p>Semester Exchange</p>
    <p class="edu-detail">Dean's List, Spring 2025</p>
  </div>
</article>

</section>
