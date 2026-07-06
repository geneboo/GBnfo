export const stationData = {
  about: {
    title:'Gene Boo', subtitle:'Math · Code · Sound',
    body:'<p>Where mathematics meets technology and creativity.</p><p><strong>Mantra:</strong> Old whip, ancient keys, but the stack is clean. Zero-dollar budget, major power in the machine.</p>',
    cards:[
      {icon:'💡',title:'Code Alchemist',desc:'Web apps, real-time DSP, quant tooling, and interaction design.'},
      {icon:'📊',title:'Quant & Modeler',desc:'Mathematical modeling, risk analytics, numerical methods, Python, C++, Rust, and CUDA.'},
      {icon:'🎛️',title:'Audio / Visual Engineer',desc:'VST3 synths, mastering tools, drum machines, and generative visuals.'}
    ],
    links:[{text:'SoundCloud',url:'https://soundcloud.com/gb-diz-zy-unofficial'},{text:'LinkedIn',url:'https://www.linkedin.com/in/gene-boo-007/'},{text:'GitHub',url:'https://github.com/geneboo'}]
  },
  resume: {
    title:'CVs & Cover Letters', subtitle:'Professional profile and documents', body:'<p>Résumé, cover letter, and career snapshots.</p>',
    cards:[
      {icon:'📄',title:'Cover Letter',desc:'Letter of introduction.',links:[{text:'View PDF',url:'assets/Cover Letter - Gene Boo.pdf'}]},
      {icon:'📘',title:'CV 2026',desc:'Latest CV.',links:[{text:'HTML',url:'CV_GB_2026_v2-s.html'},{text:'PDF',url:'assets/CV of Gene Boo (2026 v2-s).pdf'}]},
      {icon:'📗',title:'CV 2025',desc:'Previous edition.',links:[{text:'HTML',url:'CV_GB_2025_v1-s.html'}]},
      {icon:'📙',title:'CV 2024',desc:'Archive edition.',links:[{text:'PDF',url:'assets/CV of Gene Boo (2024 v3-s).pdf'}]}
    ]
  },
  projects: {
    title:"Engineer's Desk", subtitle:'Apps, SaaS, tools, sites, and performance systems', body:'<p>The engineering desk now collects apps, cloud demos, desktop tools, plugins, and experiments.</p>',
    cards:[
      {icon:'🗃️',title:"Gene's Parquet Viewer",desc:'Rust and Polars powered Windows inspector for large parquet datasets.',links:[{text:'Release',url:'https://github.com/geneboo/gene_products/releases/tag/Genes-Parquet-Viewer-0.7.1'}]},
      {icon:'🧰',title:'ExcelBridge',desc:'REST host that turns Excel, Sheets, and LibreOffice into front-ends for Python numerical computing.',links:[{text:'v3.1.5',url:'https://github.com/geneboo/gene_products/releases/tag/v3.1.5'}]},
      {icon:'🎨',title:'Funkygraffy!',desc:'Interactive math visualization toy with animation and color.',links:[{text:'Render',url:'https://funkygraffy.onrender.com/'}]},
      {icon:'📊',title:'Fit_it!',desc:'Upload data and rank best-fit continuous distributions.',links:[{text:'Live Demo',url:'https://fit-it-app-29330439259.asia-southeast1.run.app/#top'}]},
      {icon:'🎵',title:'FourierDoodler',desc:'Draw anything and transform it into Fourier epicycles and music.',links:[{text:'Live Demo',url:'https://fourier-doodler-3805819345.asia-southeast1.run.app'}]},
      {icon:'📡',title:'WebGL Audio Visualizer',desc:'GPU-accelerated WebGL audio visualizer.',links:[{text:'Live Demo',url:'https://webgl-audio-visualizer-3805819345.asia-southeast1.run.app/'}]}
    ]
  },
  written: {
    title:"Writer's Desk", subtitle:'Articles, papers, notebooks, and mathematical notes', body:'<p>Technical writing grouped into a calmer writer room.</p>',
    cards:[
      {icon:'📄',title:'Understanding Fourier Transform',desc:'FFT convolution for option pricing and Black-Scholes extensions.',links:[{text:'PDF',url:'assets/Gene%20Boo%20-%20FFT%20Convolution%20PDF%20BlackScholes%20Python3%20v5_.pdf'}]},
      {icon:'📊',title:'FFT Cross-Correlation vs Pearson',desc:'FFT cross-correlation compared with Pearson correlation.',links:[{text:'HTML',url:'assets/GB_FFT_Pearson_NP_Correl.html'}]},
      {icon:'📈',title:'Risk-Neutral Pricing via MGF',desc:'Moment generating functions and drift correction.',links:[{text:'HTML',url:'assets/GB_Risk-Neutral_Pricing_via_MGF_v3.html'}]},
      {icon:'🖥️',title:'NVIDIA CUDA Tiling Explained',desc:'Practical CUDA tiling via matrix multiplication.',links:[{text:'HTML',url:'assets/NVIDIA_CUDA_Tile.html'}]},
      {icon:'📐',title:'Mind the Gap',desc:'Numerical integration and quadrature methods.',links:[{text:'HTML',url:'assets/GB_Mind_the_Gap_Under_the_Curve_with_sidebar.html'}]},
      {icon:'📚',title:'Beyond the Formulas',desc:'MLE, FFT, Laplace transforms, copulas, quadrature, autodiff, VaR and ES.',links:[{text:'HTML',url:'assets/Empirical_MLE_FFT_Laplace_Copula_Quadrature_Autodiff_VaR_ES_NUMBERED_TOC.html'}]}
    ]
  },
  arcadeIntro: {
    title:'Arcade Room', subtitle:'Neon games, synth lab, drum machine, and persistent high scores', body:'<p>All games now live in a dedicated arcade room. Each machine saves high scores with three-letter initials.</p>',
    cards:[{icon:'🏆',title:'Persistent Leaderboards',desc:'Scores are stored locally in the browser using localStorage.'},{icon:'🎹',title:'Synth Keyboard',desc:'20-note QWERTY/mouse/touch synth with pitch wheel, filter, resonance, and LFO morphing.'},{icon:'🥁',title:'Drum Machine',desc:'16 pads, 808/909/Linn/Neuro kits, keyboard control, and effects.'}]
  }
};

export const games = [
  {id:'game_synth', name:'Synth Lab', color:'#FFBE0B'},
  {id:'game_drums', name:'Drum Machine', color:'#00E5FF'},
  {id:'game_pong', name:'Neon Pong', color:'#FF006E'},
  {id:'game_dice', name:'Dice Tower', color:'#ff9a9e'},
  {id:'game_reaction', name:'Reaction', color:'#FF9F1C'},
  {id:'game_memory', name:'Memory Match', color:'#8E54E9'}
];
