let currentQuestionIndex = 0;
let totalQuestions = 0;
let candidates = {};

// jsonデータは、questions.jsonというファイル名で保存されているjsonデータを読み込み、questionsに格納
// 質問をランダムに並べ替える関数
function shuffleQuestions(questions) {
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
}

// 回答のindex 0 と 1 をランダムに並べ替える関数
// shuffleAnserws
function shuffleAnswers(answers) {
    for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
    }
}

// Google Chartsを使用してパイチャートを描画するためのスクリプト
google.charts.load('current', {'packages':['corechart']});

function drawChart(data) {
    var chartData = google.visualization.arrayToDataTable(data);

    var options = {
        title: '候補者への支持度',
        is3D: true
    };

    var chart = new google.visualization.PieChart(document.getElementById('question-container'));
    chart.draw(chartData, options);
}

function saveTestCompletionDate() {
    const completionDate = new Date().getTime();
    const expiryDate = new Date(completionDate + 4 * 7 * 24 * 60 * 60 * 1000); // 4週間後の日付
    localStorage.setItem('testCompletionDate', JSON.stringify({ completionDate, expiryDate }));
}

function canTakeTestAgain() {
    const testCompletionData = JSON.parse(localStorage.getItem('testCompletionDate'));
    if (testCompletionData) {
        const currentDate = new Date().getTime();
        return currentDate > new Date(testCompletionData.expiryDate).getTime();
    }
    return true; // ローカルストレージにデータがなければ、テストを受けられる
}

function submitAnswers() {
    // ボタンを非表示にする
    document.getElementById('next-button').style.display = 'none';
    document.getElementById('question-notice').style.display = 'none';
    document.getElementById('question-counter').style.display = 'none';

    // 回答の集計ロジックを再実装
    let results = {
        grassroots: 0,
        organization: 0,
        unknown: 0
    };
    questions.forEach((q, index) => {
        const selectedAnswer = document.querySelector(`input[name="question${index}"]:checked`);
        if (selectedAnswer) {
            var q_id = `q{$q.id}`;
            if (selectedAnswer.value === "grassroots") {
                gtag('set', 'user_properties', {
                    [q_id]: 'grassroot'
                });
                results.grassroots += q.weight;
            } else if (selectedAnswer.value === "organization") {
                gtag('set', 'user_properties', {
                    [q_id]: 'organization'
                });
                results.organization += q.weight;
            } else {
                gtag('set', 'user_properties', {
                    [q_id]: 'unknown'
                });
                results.unknown++; // unknownの回答があった場合は、unknownのカウントを加算
            }
        }
    });
    // 診断結果の集計
    var data = [
        ['候補者', 'スコア'],
        [candidates[0].name, results.grassroots],
        [candidates[1].name, results.organization]
    ];

    // unknownの回答が多い場合は、結果を表示せずにエラーメッセージを表示する
    // 指紋個数の1/3以上がunknownの場合は、エラーメッセージを表示する
    if (results.unknown > totalQuestions / 3) {
        document.getElementById('question-container').innerHTML = '<h2>回答が不十分です。もう一度やり直してください。</h2>';
        return;
    }
    drawChart(data); // チャートを描画

    // 結果の集計が完了した後に結果セクションを表示する
    document.getElementById('result-section').classList.remove('hidden');

    // 診断結果のテキストを設定
    var resultText = "私の熊本県知事選2024の候補者のAI好み性診断結果は、" + (results.grassroots > results.organization ? "幸山政史候補がより好みと評価できます。" : "木村敬候補がより好みと評価できます。");
    document.getElementById('result-text').textContent = resultText;

    // Twitterシェアリンクの設定
    var twitterShareLink = "https://twitter.com/share?text=" + encodeURIComponent(resultText) + "&url=https://jfk.github.io/kumamoto-vote-2024/&hashtags=熊本県知事選2024,AI好み診断";
    document.getElementById('twitter-share-button').href = twitterShareLink;

    saveTestCompletionDate(); // テスト完了日を保存

    if (results.grassroots > results.organization) {
        gtag('event', 'grassroots_count', {
            'event_category': 'Diagnosis Results',
            'event_label': 'Grassroots',
            'value': 1
        });
    } else if (results.organization > results.grassroots) {
        gtag('event', 'organization_count', {
            'event_category': 'Diagnosis Results',
            'event_label': 'Organization',
            'value': 1
        });
    }
    gtag('event', 'grassroots', {
        'event_category': 'Diagnosis Results',
        'event_label': 'Grassroots',
        'value': results.grassroots
    });
    gtag('event', 'organization', {
        'event_category': 'Diagnosis Results',
        'event_label': 'Organization',
        'value': results.organization
    });
    gtag('event', 'unknown', {
        'event_category': 'Diagnosis Results',
        'event_label': 'Version',
        'value': results.unknown
    });
    gtag('event', 'lead_form_submit', {
        'event_category': 'Diagnosis Results',
        'event_label': 'Conversion',
        'value': 1
    });
}

function updateButtonState() {
  const selectedAnswer = document.querySelector(`input[name="question${currentQuestionIndex}"]:checked`);
  const nextButton = document.getElementById('next-button');
  if(selectedAnswer) {
    nextButton.disabled = false;
    nextButton.style.backgroundColor = '#007bff';
  } else {
    nextButton.disabled = true;
    nextButton.style.backgroundColor = '#cccccc';
  }
}

function showQuestion(index) {
    document.querySelectorAll('.question-container').forEach((el) => {
        el.classList.add('hidden');
    });
    // 現在の質問を表示する
    document.getElementById(`question${index}`).classList.remove('hidden');
    // 質問番号を更新する
    document.getElementById('question-counter').textContent = `質問 ${index + 1} / ${totalQuestions}`;
    const questionCounter = document.getElementById('question-counter');
    questionCounter.textContent = `質問 ${index + 1} / ${totalQuestions}`;
    const nextButton = document.getElementById('next-button');
    if (index === totalQuestions - 1) {
        nextButton.textContent = '結果を表示';
    } else {
        nextButton.textContent = '次へ';
    }
    updateButtonState();
}

function showNextQuestion() {
    // 現在の質問の回答を確認
    const selectedAnswer = document.querySelector(`input[name="question${currentQuestionIndex}"]:checked`);
    if (!selectedAnswer) {
        alert('回答を選択してください。');
        return;
    }
    // 最後の質問であれば結果を表示
    if (currentQuestionIndex === totalQuestions - 1) {
        submitAnswers();
        return;
    }
    if (currentQuestionIndex === totalQuestions - 1) {
        submitAnswers(); // 結果を表示する関数を呼び出す
    } else {
        // 次の質問へ
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    }
}

function initQuiz() {
    const container = document.getElementById('question-container');
    questions.forEach((q, index) => {
        const questionEl = document.createElement('div');
        questionEl.classList.add('question-container');
        questionEl.id = `question${index}`;

        // 質問テキストを追加
        const questionText = document.createElement('div');
        questionText.classList.add('question-text');
        questionText.textContent = `${q.category}: ${q.question}`;
        questionEl.appendChild(questionText);

        // 質問の目的と理由を説明するテキストを追加
        const noticeText = document.createElement('div');
        noticeText.classList.add('question-description');
        noticeText.textContent = `AI: ${q.description}`;
        questionEl.appendChild(noticeText);

        // 回答オプションを追加
        const answersList = document.createElement('ul');
        shuffleAnswers(q.answers);
        q.answers.forEach(a => {
            const answerItem = document.createElement('li');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `question${index}`;
            input.id = `question${index}_${a.value}`;
            input.value = a.value;
            input.required = true;

            const label = document.createElement('label');
            label.classList.add('answer-label');
            label.setAttribute('for', input.id);
            label.textContent = a.text;

            answerItem.appendChild(input);
            answerItem.appendChild(label);
            answersList.appendChild(answerItem);
        });
        // 回答オプションに「選択肢にあてはまらない」を追加 
        // {"text": "選択肢にあてはまらない", "value": "unknown"}
        const answerItem = document.createElement('li');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `question${index}`;
        input.id = `question${index}_unknown`;
        input.value = 'unknown';
        input.required = true;
        const label = document.createElement('label');
        label.classList.add('answer-label');
        label.setAttribute('for', input.id);
        label.textContent = '選択肢にあてはまらない';
        answerItem.appendChild(input);
        answerItem.appendChild(label);
        answersList.appendChild(answerItem);

        questionEl.appendChild(answersList);

        container.appendChild(questionEl);
    });

    questions.forEach((q, index) => {
        q.answers.forEach(a => {
        const id = `question${index}_${a.value}`;
        document.getElementById(id).addEventListener('change', updateButtonState);
        });
    });

    // 最初の質問を表示
    showQuestion(0);

    // ボタンのhiddenを解除
    document.getElementById('next-button').classList.remove('hidden');
    document.getElementById('question-notice').classList.remove('hidden');
}

document.getElementById('agree-button').addEventListener('click', function() {
    // 同意事項セクションを非表示にする
    document.getElementById('consent-section').style.display = 'none';
    
    // 質問フォームを表示する（質問のロードなどの初期化処理を行う）
    fetchQuestionsAndInitializeQuiz();
});

function loadConfig() {
    fetch('https://jfk.github.io/kumamoto-vote-2024/config.json')
      .then(response => response.json())
      .then(data => {
        candidates = data.candidates;
        for (let i = 0; i < candidates.length; i++) {
            const img = document.getElementById(`candidate-photo${i + 1}`);
            img.src = candidates[i].img.src;
            img.alt = candidates[i].img.alt;
            const name = document.getElementById(`candidate-name${i + 1}`);
            name.textContent = candidates[i].name;
        }
      })
      .catch(error => {
        console.error('設定データの読み込みに失敗しました:', error);
      });
}

function fetchQuestionsAndInitializeQuiz() {
    fetch('https://jfk.github.io/kumamoto-vote-2024/questions.json')
      .then(response => response.json())
      .then(data => {
        shuffleQuestions(data);
        questions = data;
        totalQuestions = questions.length;
        initQuiz(); // questions.jsonからデータを取得した後にinitQuizを呼び出す
      })
      .catch(error => {
        console.error('質問データの読み込みに失敗しました:', error);
      });
}

window.onload = function() {
  loadConfig();
  if (!canTakeTestAgain()) {
    alert('診断テストは1回のみ受けられます。');
    document.getElementById('quiz-form').style.display = 'none';
    document.getElementById('consent-section').style.display = 'none';
  }
};
