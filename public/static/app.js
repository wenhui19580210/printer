// グローバル変数
let currentProperty = null;
let currentYearMonth = new Date().toISOString().slice(0, 7);

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadProperties();
  renderApp();
});

// 物件一覧の読み込み
async function loadProperties() {
  try {
    const response = await axios.get('/api/properties');
    const properties = response.data;
    if (properties.length > 0) {
      currentProperty = properties[0];
    }
  } catch (error) {
    console.error('物件の読み込みに失敗しました:', error);
  }
}

// メインアプリのレンダリング
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- ヘッダー -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <h1 class="text-3xl font-bold text-gray-900">
            <i class="fas fa-building mr-2"></i>
            不動産月次収支報告書システム
          </h1>
        </div>
      </header>

      <!-- メインコンテンツ -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- タブナビゲーション -->
        <div class="mb-6">
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8">
              <button onclick="switchTab('report')" id="tab-report" class="tab-button border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                <i class="fas fa-file-invoice mr-2"></i>月次報告書
              </button>
              <button onclick="switchTab('contracts')" id="tab-contracts" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                <i class="fas fa-file-contract mr-2"></i>契約管理
              </button>
              <button onclick="switchTab('expenses')" id="tab-expenses" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                <i class="fas fa-money-bill-wave mr-2"></i>支出管理
              </button>
              <button onclick="switchTab('rooms')" id="tab-rooms" class="tab-button border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                <i class="fas fa-door-open mr-2"></i>部屋管理
              </button>
            </nav>
          </div>
        </div>

        <!-- タブコンテンツ -->
        <div id="tab-content"></div>
      </main>
    </div>
  `;

  // デフォルトタブを表示
  switchTab('report');
}

// タブ切り替え
async function switchTab(tabName) {
  // タブボタンのスタイル更新
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('border-blue-500', 'text-blue-600');
    btn.classList.add('border-transparent', 'text-gray-500');
  });
  document.getElementById(`tab-${tabName}`).classList.remove('border-transparent', 'text-gray-500');
  document.getElementById(`tab-${tabName}`).classList.add('border-blue-500', 'text-blue-600');

  // コンテンツの表示
  const content = document.getElementById('tab-content');
  
  switch(tabName) {
    case 'report':
      await renderReportTab(content);
      break;
    case 'contracts':
      await renderContractsTab(content);
      break;
    case 'expenses':
      await renderExpensesTab(content);
      break;
    case 'rooms':
      await renderRoomsTab(content);
      break;
  }
}

// 月次報告書タブ
async function renderReportTab(container) {
  if (!currentProperty) {
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-gray-500">物件が登録されていません。</p></div>';
    return;
  }

  try {
    const response = await axios.get(`/api/properties/${currentProperty.id}/report?year_month=${currentYearMonth}`);
    const data = response.data;

    container.innerHTML = `
      <div class="bg-white rounded-lg shadow">
        <!-- 年月選択 -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">${data.property.name}</h2>
              <p class="text-sm text-gray-600">${data.property.address}</p>
            </div>
            <div class="flex items-center space-x-4">
              <label class="text-sm font-medium text-gray-700">対象年月:</label>
              <input type="month" id="yearMonth" value="${currentYearMonth}" 
                     class="border border-gray-300 rounded-md px-3 py-2"
                     onchange="currentYearMonth = this.value; switchTab('report')">
              <button onclick="generatePDF()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                <i class="fas fa-file-pdf mr-2"></i>PDF出力
              </button>
            </div>
          </div>
        </div>

        <!-- 報告書本体 -->
        <div class="p-6">
          <div class="mb-6 text-right">
            <p class="text-sm text-gray-600">収支報告日: ${data.report_date}</p>
            <h3 class="text-lg font-semibold">${data.property.name} ${data.year_month.replace('-', '年')}月分</h3>
          </div>

          <!-- 収入の部 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-4 bg-gray-100 p-2">収入の部</h3>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">部屋番号</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">契約者名</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">賃料</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">管理費</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">駐車料金</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">その他</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">小計</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${data.contracts.map(c => {
                  const subtotal = (c.rent || 0) + (c.management_fee || 0) + (c.parking_fee || 0) + (c.other_fee || 0);
                  return `
                    <tr>
                      <td class="px-4 py-2 text-sm">${c.room_number}</td>
                      <td class="px-4 py-2 text-sm">${c.contractor_name}</td>
                      <td class="px-4 py-2 text-sm text-right">${(c.rent || 0).toLocaleString()}</td>
                      <td class="px-4 py-2 text-sm text-right">${(c.management_fee || 0).toLocaleString()}</td>
                      <td class="px-4 py-2 text-sm text-right">${(c.parking_fee || 0).toLocaleString()}</td>
                      <td class="px-4 py-2 text-sm text-right">${(c.other_fee || 0).toLocaleString()}</td>
                      <td class="px-4 py-2 text-sm text-right font-semibold">${subtotal.toLocaleString()}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="bg-gray-50 font-bold">
                  <td colspan="6" class="px-4 py-2 text-sm text-right">合計</td>
                  <td class="px-4 py-2 text-sm text-right">${data.total_income.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 支出の部 -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-4 bg-gray-100 p-2">支出の部</h3>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">項目</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">本体</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">税</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">総額</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${data.expenses.map(e => `
                  <tr>
                    <td class="px-4 py-2 text-sm">${e.item_name}</td>
                    <td class="px-4 py-2 text-sm">${e.description || ''}</td>
                    <td class="px-4 py-2 text-sm text-right">${(e.amount || 0).toLocaleString()}</td>
                    <td class="px-4 py-2 text-sm text-right">${(e.tax || 0).toLocaleString()}</td>
                    <td class="px-4 py-2 text-sm text-right">${(e.total || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="bg-gray-50 font-bold">
                  <td colspan="4" class="px-4 py-2 text-sm text-right">合計</td>
                  <td class="px-4 py-2 text-sm text-right">${data.total_expense.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 収支サマリー -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-sm text-gray-600">総収入</p>
                <p class="text-2xl font-bold text-blue-600">¥${data.total_income.toLocaleString()}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">総支出</p>
                <p class="text-2xl font-bold text-red-600">¥${data.total_expense.toLocaleString()}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">純利益</p>
                <p class="text-2xl font-bold ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}">¥${data.net_income.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('報告書の読み込みに失敗しました:', error);
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-red-500">報告書の読み込みに失敗しました。</p></div>';
  }
}

// 契約管理タブ
async function renderContractsTab(container) {
  if (!currentProperty) {
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-gray-500">物件が登録されていません。</p></div>';
    return;
  }

  try {
    const response = await axios.get(`/api/properties/${currentProperty.id}/active-contracts`);
    const contracts = response.data;

    container.innerHTML = `
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-900">契約一覧</h2>
            <button onclick="showContractForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              <i class="fas fa-plus mr-2"></i>新規契約
            </button>
          </div>
        </div>
        <div class="p-6">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">部屋番号</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">契約者名</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">賃料</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">管理費</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">駐車料金</th>
                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">契約開始日</th>
                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${contracts.map(c => `
                <tr>
                  <td class="px-4 py-2 text-sm">${c.room_number}</td>
                  <td class="px-4 py-2 text-sm">${c.contractor_name}</td>
                  <td class="px-4 py-2 text-sm text-right">¥${(c.rent || 0).toLocaleString()}</td>
                  <td class="px-4 py-2 text-sm text-right">¥${(c.management_fee || 0).toLocaleString()}</td>
                  <td class="px-4 py-2 text-sm text-right">¥${(c.parking_fee || 0).toLocaleString()}</td>
                  <td class="px-4 py-2 text-sm text-center">${c.start_date}</td>
                  <td class="px-4 py-2 text-sm text-center">
                    <button onclick="editContract(${c.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteContract(${c.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('契約の読み込みに失敗しました:', error);
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-red-500">契約の読み込みに失敗しました。</p></div>';
  }
}

// 支出管理タブ
async function renderExpensesTab(container) {
  if (!currentProperty) {
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-gray-500">物件が登録されていません。</p></div>';
    return;
  }

  try {
    const response = await axios.get(`/api/properties/${currentProperty.id}/expenses?year_month=${currentYearMonth}`);
    const expenses = response.data;

    container.innerHTML = `
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <h2 class="text-xl font-semibold text-gray-900">支出一覧</h2>
              <input type="month" id="expenseYearMonth" value="${currentYearMonth}" 
                     class="border border-gray-300 rounded-md px-3 py-2"
                     onchange="currentYearMonth = this.value; switchTab('expenses')">
            </div>
            <button onclick="showExpenseForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              <i class="fas fa-plus mr-2"></i>支出を追加
            </button>
          </div>
        </div>
        <div class="p-6">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">項目名</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">本体</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">税</th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">総額</th>
                <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${expenses.map(e => `
                <tr>
                  <td class="px-4 py-2 text-sm">${e.item_name}</td>
                  <td class="px-4 py-2 text-sm">${e.description || ''}</td>
                  <td class="px-4 py-2 text-sm text-right">¥${(e.amount || 0).toLocaleString()}</td>
                  <td class="px-4 py-2 text-sm text-right">¥${(e.tax || 0).toLocaleString()}</td>
                  <td class="px-4 py-2 text-sm text-right font-semibold">¥${(e.total || 0).toLocaleString()}</td>
                  <td class="px-4 py-2 text-sm text-center">
                    <button onclick="editExpense(${e.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteExpense(${e.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('支出の読み込みに失敗しました:', error);
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-red-500">支出の読み込みに失敗しました。</p></div>';
  }
}

// 部屋管理タブ
async function renderRoomsTab(container) {
  if (!currentProperty) {
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-gray-500">物件が登録されていません。</p></div>';
    return;
  }

  try {
    const response = await axios.get(`/api/properties/${currentProperty.id}/rooms`);
    const rooms = response.data;

    container.innerHTML = `
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-900">部屋一覧</h2>
            <button onclick="showRoomForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
              <i class="fas fa-plus mr-2"></i>部屋を追加
            </button>
          </div>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-4 gap-4">
            ${rooms.map(r => `
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="text-lg font-semibold">${r.room_number}</h3>
                    <p class="text-sm text-gray-500">${r.floor}</p>
                  </div>
                  <div>
                    <button onclick="editRoom(${r.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteRoom(${r.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('部屋の読み込みに失敗しました:', error);
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6"><p class="text-red-500">部屋の読み込みに失敗しました。</p></div>';
  }
}

// PDF出力（簡易実装）
function generatePDF() {
  alert('PDF出力機能は実装中です。ブラウザの印刷機能をご利用ください。');
  window.print();
}

// モーダル表示用の汎用関数
function showModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold">${title}</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${content}
    </div>
  `;
  document.body.appendChild(modal);
}

// 支出フォームの表示
function showExpenseForm(expense = null) {
  const content = `
    <form id="expenseForm" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">項目名</label>
        <input type="text" name="item_name" value="${expense?.item_name || ''}" required
               class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">摘要</label>
        <input type="text" name="description" value="${expense?.description || ''}"
               class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">本体</label>
          <input type="number" name="amount" value="${expense?.amount || 0}" required
                 class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">税</label>
          <input type="number" name="tax" value="${expense?.tax || 0}" required
                 class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">総額</label>
          <input type="number" name="total" value="${expense?.total || 0}" required
                 class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
        </div>
      </div>
      <div class="flex justify-end space-x-2">
        <button type="button" onclick="this.closest('.fixed').remove()"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
          キャンセル
        </button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          保存
        </button>
      </div>
    </form>
  `;
  
  showModal(expense ? '支出を編集' : '支出を追加', content);
  
  document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      property_id: currentProperty.id,
      year_month: currentYearMonth,
      item_name: formData.get('item_name'),
      description: formData.get('description'),
      amount: parseInt(formData.get('amount')),
      tax: parseInt(formData.get('tax')),
      total: parseInt(formData.get('total'))
    };
    
    try {
      if (expense) {
        await axios.put(`/api/expenses/${expense.id}`, data);
      } else {
        await axios.post('/api/expenses', data);
      }
      document.querySelector('.fixed').remove();
      switchTab('expenses');
    } catch (error) {
      console.error('保存に失敗しました:', error);
      alert('保存に失敗しました');
    }
  });
}

// 契約削除
async function deleteContract(id) {
  if (confirm('この契約を削除しますか？')) {
    try {
      await axios.delete(`/api/contracts/${id}`);
      switchTab('contracts');
    } catch (error) {
      console.error('削除に失敗しました:', error);
      alert('削除に失敗しました');
    }
  }
}

// 支出削除
async function deleteExpense(id) {
  if (confirm('この支出を削除しますか？')) {
    try {
      await axios.delete(`/api/expenses/${id}`);
      switchTab('expenses');
    } catch (error) {
      console.error('削除に失敗しました:', error);
      alert('削除に失敗しました');
    }
  }
}

// その他の関数（編集フォームなど）は必要に応じて実装
function showContractForm() { alert('契約フォームは実装中です'); }
function editContract(id) { alert('編集機能は実装中です'); }
function showRoomForm() { alert('部屋フォームは実装中です'); }
function editRoom(id) { alert('編集機能は実装中です'); }
function deleteRoom(id) { alert('削除機能は実装中です'); }
function editExpense(id) { alert('編集機能は実装中です'); }
