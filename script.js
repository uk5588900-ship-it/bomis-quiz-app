(function () {
  const quizFiestaQuestions = [
    {
      question: 'ON WHICH DAY, WORLD SCIENCE DAY IS CELEBRATED?',
      options: ['10 November', '5 June', '22 April', '28 February'],
      answerIndex: 0
    },
    {
      question: 'Class 9: What is the SI unit of speed?',
      options: ['km/h', 'm/s', 'm', 's'],
      answerIndex: 1
    },
    {
      question: 'Class 9: Which organelle is called the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Vacuole'],
      answerIndex: 1
    },
    {
      question: 'Class 9: Which acid is present in lemon?',
      options: ['Acetic acid', 'Citric acid', 'Lactic acid', 'Sulfuric acid'],
      answerIndex: 1
    },
    {
      question: 'Class 9: The chemical formula of water is:',
      options: ['CO2', 'H2O', 'O2', 'NaCl'],
      answerIndex: 1
    },
    {
      question: 'Class 9: Which tissue transports water in plants?',
      options: ['Phloem', 'Xylem', 'Epidermis', 'Parenchyma'],
      answerIndex: 1
    },
    {
      question: 'Class 9: Which planet is known as the Red Planet?',
      options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
      answerIndex: 2
    },
    {
      question: 'Class 9: What is the pH of a neutral solution?',
      options: ['0', '7', '10', '14'],
      answerIndex: 1
    },
    {
      question: 'Class 9: The law of inertia was given by:',
      options: ['Newton', 'Einstein', 'Galileo', 'Bohr'],
      answerIndex: 0
    },
    {
      question: 'Class 9: Which blood cells carry oxygen?',
      options: ['WBC', 'Platelets', 'RBC', 'Plasma'],
      answerIndex: 2
    },
    {
      question: 'Class 9: The process of conversion of liquid into vapor is called:',
      options: ['Condensation', 'Evaporation', 'Sublimation', 'Freezing'],
      answerIndex: 1
    },
    {
      question: 'Class 10 (Easy): Which gas is released during photosynthesis?',
      options: ['Nitrogen', 'Hydrogen', 'Oxygen', 'Carbon monoxide'],
      answerIndex: 2
    },
    {
      question: 'Class 10 (Easy): The atomic number of carbon is:',
      options: ['6', '8', '12', '14'],
      answerIndex: 0
    },
    {
      question: 'Class 10 (Easy): Which lens is used to correct myopia?',
      options: ['Convex lens', 'Concave lens', 'Bifocal lens', 'Cylindrical lens'],
      answerIndex: 1
    },
    {
      question: 'Class 10 (Easy): Which part of the brain controls balance of the body?',
      options: ['Cerebrum', 'Medulla', 'Cerebellum', 'Spinal cord'],
      answerIndex: 2
    }
  ];

  const apiBase = (function () {
    const isLiveServer = window.location.port === '5500';
    const isFileProtocol = window.location.protocol === 'file:';
    return (isLiveServer || isFileProtocol) ? 'http://localhost:3000' : '';
  })();

  function el(id) {
    return document.getElementById(id);
  }

  function showQuizScreen(targetId) {
    const screens = [
      el('quiz-intro-screen'),
      el('quiz-questions-screen'),
      el('quiz-result-screen')
    ];

    screens.forEach(function (screen) {
      if (!screen) {
        return;
      }
      if (screen.id === targetId) {
        screen.classList.remove('hidden');
        screen.classList.remove('quiz-slide-in');
        void screen.offsetWidth;
        screen.classList.add('quiz-slide-in');
      } else {
        screen.classList.add('hidden');
      }
    });
  }

  function renderQuizFiestaQuestions() {
    const list = el('quiz-questions-list');
    if (!list) {
      return;
    }

    list.innerHTML = quizFiestaQuestions.map(function (item, index) {
      const options = item.options.map(function (option, optionIndex) {
        return (
          "<label class='mcq-option flex items-start gap-3 rounded-xl border px-3 py-2.5'>" +
          "<input type='radio' name='quiz-q-" + index + "' value='" + optionIndex + "' class='mt-1 h-4 w-4 accent-green-600'>" +
          "<span class='text-sm md:text-[15px] text-blue-700 font-semibold leading-snug'>" + option + "</span>" +
          "</label>"
        );
      }).join('');

      return (
        "<div class='mcq-card rounded-2xl border p-4 bg-white' style='animation-delay:" + (index * 0.06).toFixed(2) + "s'>" +
        "<p class='text-base md:text-lg font-bold text-black mb-3 leading-snug'>" +
        "<span class='text-black'>" + (index + 1) + ".</span> " + item.question +
        "</p>" +
        "<div class='space-y-2'>" + options + "</div>" +
        "</div>"
      );
    }).join('');
  }

  async function saveQuizResult(payload) {
    const response = await fetch(apiBase + '/api/quiz-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || 'Could not save quiz result.');
    }

    return data;
  }

  window.openQuizFiesta = function openQuizFiesta() {
    showQuizScreen('quiz-intro-screen');
    if (el('quiz-save-status')) {
      el('quiz-save-status').textContent = '';
    }
  };

  window.startQuizFiesta = function startQuizFiesta(buttonEl) {
    const studentInput = el('quiz-student-name');
    const studentName = studentInput ? String(studentInput.value || '').trim() : '';
    if (!studentName) {
      window.alert('Please enter student name before starting the quiz.');
      if (studentInput) {
        studentInput.focus();
      }
      return;
    }

    if (buttonEl) {
      buttonEl.classList.remove('quiz-start-click');
      void buttonEl.offsetWidth;
      buttonEl.classList.add('quiz-start-click');
    }

    renderQuizFiestaQuestions();
    window.setTimeout(function () {
      showQuizScreen('quiz-questions-screen');
    }, 280);
  };

  window.submitQuizFiesta = async function submitQuizFiesta() {
    const questions = el('quiz-questions-screen');
    const scoreText = el('quiz-result-score');
    const percentageText = el('quiz-result-percentage');
    const saveStatusText = el('quiz-save-status');
    if (!questions || !scoreText || !percentageText) {
      return;
    }

    let score = 0;
    const marksPerQuestion = 4;
    quizFiestaQuestions.forEach(function (item, index) {
      const selected = document.querySelector("input[name='quiz-q-" + index + "']:checked");
      if (selected && Number(selected.value) === item.answerIndex) {
        score += marksPerQuestion;
      }
    });

    const total = quizFiestaQuestions.length * marksPerQuestion;
    const percentage = total ? (score / total) * 100 : 0;
    const studentInput = el('quiz-student-name');
    const studentName = studentInput ? String(studentInput.value || '').trim() : '';

    scoreText.textContent = 'SCORE: ' + score + ' / ' + total;
    percentageText.textContent = percentage.toFixed(2) + '%';
    if (saveStatusText) {
      saveStatusText.textContent = 'Saving result...';
    }

    questions.classList.add('hidden');
    showQuizScreen('quiz-result-screen');

    try {
      await saveQuizResult({
        studentName: studentName || 'Unknown',
        score: score,
        total: total,
        percentage: Number(percentage.toFixed(2))
      });
      if (saveStatusText) {
        saveStatusText.textContent = 'Result saved to database successfully.';
      }
    } catch (error) {
      if (saveStatusText) {
        const message = error && error.message ? error.message : 'Could not save result.';
        saveStatusText.textContent = 'Save failed: ' + message;
      }
    }
  };

  showQuizScreen('quiz-intro-screen');
})();
