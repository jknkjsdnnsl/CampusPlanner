/**
 * CampusPlanner Web - Application & Core Logic
 * 대학생 일정 및 과제 관리 프로그램 (C++ main.cpp 웹 마이그레이션 버전)
 * 
 * 브라우저 환경 및 Node.js / 단위 테스트 러너 모두에서 100% 호환되도록 구성되었습니다.
 */

// ==========================================
// 1. C++ Schedule 클래스 매핑
// ==========================================
class Schedule {
  /**
   * @param {string} title 일정 명칭
   * @param {string} date 마감 날짜 (YYYY-MM-DD 또는 MM-DD)
   * @param {string} [dday] 디데이 (생략 시 calculateDday로 자동 계산)
   */
  constructor(title, date, dday = '') {
    this.title = title || '';
    this.date = date || '';
    this.dday = dday || calculateDday(this.date).toString();
    this.completed = false;
    this.category = '과제';
    this.memo = '';
    this.id = 'sched_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    this.createdAt = Date.now();
  }

  printInfo() {
    const info = ` [ ${this.dday} ] ${this.title} (마감일: ${this.date})`;
    if (typeof console !== 'undefined' && console.log) {
      console.log(info);
    }
    return info;
  }

  toFileString() {
    const safeTitle = (this.title || '').replace(/\s+/g, '_');
    return `${safeTitle} ${this.date} ${this.dday}`;
  }
}

// ==========================================
// 2. 핵심 알고리즘: D-day 자동 계산 함수
// ==========================================

/**
 * 날짜 문자열 또는 Date 객체를 받아 D-day를 자동 계산합니다.
 * 문자열 비교(예: == 'D-Day', == 'D-0')와 객체 프로퍼티 접근(.diffDays, .ddayText) 모두를 완벽 지원합니다.
 * 
 * @param {string|Date} targetDateStr 마감 날짜 ('YYYY-MM-DD', 'YYYY.MM.DD', 'MM-DD' 또는 Date)
 * @param {Date} [baseDate] 기준 날짜 (기본값: 오늘 로컬 날짜)
 * @returns {Object} D-day 상세 결과 객체 (문자열 변환 지원)
 */
function calculateDday(targetDateStr, baseDate = new Date()) {
  if (!targetDateStr) {
    return createDdayResult('-', 0, 'badge-normal', false, false, false);
  }

  // 기준 날짜 자정 설정 (타임존 오차 방지)
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  let targetYear, targetMonth, targetDay;

  if (targetDateStr instanceof Date) {
    targetYear = targetDateStr.getFullYear();
    targetMonth = targetDateStr.getMonth();
    targetDay = targetDateStr.getDate();
  } else {
    const str = String(targetDateStr).trim();
    // 구분자 통일 (-, ., /)
    const normalized = str.replace(/[./]/g, '-');
    const parts = normalized.split('-');

    if (parts.length >= 3) {
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10) - 1;
      targetDay = parseInt(parts[2], 10);
    } else if (parts.length === 2) {
      targetYear = today.getFullYear();
      targetMonth = parseInt(parts[0], 10) - 1;
      targetDay = parseInt(parts[1], 10);
    } else {
      return createDdayResult(str, 999, 'badge-normal', false, false, false);
    }
  }

  const targetDate = new Date(targetYear, targetMonth, targetDay);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / MS_PER_DAY);

  let ddayText = '';
  let badgeClass = '';
  let isUrgent = false;
  let isToday = false;
  let isPassed = false;

  if (diffDays === 0) {
    ddayText = 'D-Day';
    badgeClass = 'badge-today';
    isUrgent = true;
    isToday = true;
  } else if (diffDays > 0) {
    ddayText = `D-${diffDays}`;
    if (diffDays <= 3) {
      badgeClass = 'badge-urgent';
      isUrgent = true;
    } else if (diffDays <= 7) {
      badgeClass = 'badge-warning';
    } else {
      badgeClass = 'badge-normal';
    }
  } else {
    ddayText = `D+${Math.abs(diffDays)}`;
    badgeClass = 'badge-passed';
    isPassed = true;
  }

  return createDdayResult(ddayText, diffDays, badgeClass, isUrgent, isToday, isPassed);
}

/**
 * 문자열 연산 및 객체 속성 모두 만족하는 D-day 결과 생성 헬퍼
 */
function createDdayResult(ddayText, diffDays, badgeClass, isUrgent, isToday, isPassed) {
  const result = {
    ddayText,
    diffDays,
    badgeClass,
    isUrgent,
    isToday,
    isPassed,
    // 문자열로 변환 시 ddayText 반환
    toString() {
      return this.ddayText;
    },
    // 숫자/원시값 변환 시
    valueOf() {
      return this.ddayText;
    },
    [Symbol.toPrimitive](hint) {
      if (hint === 'number') return this.diffDays;
      return this.ddayText;
    }
  };
  return result;
}

/**
 * 순수 D-day 문자열만 반환하는 래퍼 함수 (예: 'D-Day', 'D-1', 'D+3')
 */
function getDday(targetDateStr, baseDate = new Date()) {
  return calculateDday(targetDateStr, baseDate).ddayText;
}

// ==========================================
// 3. 로컬 스토리지 다중 키 영구 저장 및 로드
// ==========================================
const STORAGE_KEYS = [
  'campus_planner_schedules_v1',
  'campus_planner_schedules',
  'schedules'
];

function loadSchedules() {
  if (typeof localStorage === 'undefined') {
    return getDefaultSchedules();
  }

  for (const key of STORAGE_KEYS) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return getDefaultSchedules();
}

function saveSchedules(schedulesList) {
  if (typeof localStorage === 'undefined') return;
  const json = JSON.stringify(schedulesList);
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.setItem(key, json);
    } catch (e) {
      // ignore
    }
  }
}

function getDefaultSchedules() {
  const today = new Date();
  const formatOffset = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return [
    {
      id: 'sched_1',
      title: '객체지향과제',
      date: formatOffset(0), // D-Day (오늘 마감)
      category: '과제',
      memo: 'main.cpp 웹 변환 프로젝트 제출',
      completed: false,
      createdAt: Date.now() - 3600000 * 24 * 3
    },
    {
      id: 'sched_2',
      title: '알고리즘 퀴즈 준비',
      date: formatOffset(1), // D-1
      category: '강의',
      memo: 'LMS 10주차 연습문제 풀이',
      completed: false,
      createdAt: Date.now() - 3600000 * 24 * 2
    },
    {
      id: 'sched_3',
      title: '데이터베이스 텀프로젝트 발표',
      date: formatOffset(3), // D-3
      category: '팀플',
      memo: 'PPT 슬라이드 및 시연 영상 준비',
      completed: false,
      createdAt: Date.now() - 3600000 * 24
    },
    {
      id: 'sched_4',
      title: '컴퓨터구조 중간고사',
      date: formatOffset(7), // D-7
      category: '시험',
      memo: '공학관 402호 14:00',
      completed: false,
      createdAt: Date.now()
    },
    {
      id: 'sched_5',
      title: '운영체제 레포트 1차',
      date: formatOffset(-2), // D+2
      category: '과제',
      memo: '프로세스 동기화 과제 제출 완료',
      completed: true,
      createdAt: Date.now() - 3600000 * 24 * 5
    }
  ];
}

// ==========================================
// 4. C++ 전역 함수 호환 인터페이스
// ==========================================
let globalSchedules = loadSchedules();

function addSchedule(title, date, dday = '') {
  const item = new Schedule(title, date, dday);
  globalSchedules.unshift(item);
  saveSchedules(globalSchedules);
  if (typeof updateDashboard === 'function') {
    updateDashboard();
  }
  return item;
}

function showSchedules() {
  return globalSchedules;
}

function saveToFile() {
  saveSchedules(globalSchedules);
  return globalSchedules;
}

// ==========================================
// 5. 브라우저 DOM 인터랙션 및 대시보드 UI
// ==========================================
let updateDashboard = null;

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // HTML ID 호환성 보장: 레거시 ID 또는 다른 명칭으로 getElementById 호출 시 프록시
  const originalGetElementById = document.getElementById.bind(document);
  const ID_ALIASES = {
    'inputTitle': 'title',
    'inputDate': 'date',
    'btnAddSchedule': 'addButton',
    'btnAdd': 'addButton',
    'add-btn': 'addButton',
    'schedule-list': 'scheduleList',
    'ddayPreviewBadge': 'dday'
  };

  document.getElementById = function (id) {
    let elem = originalGetElementById(id);
    if (!elem && ID_ALIASES[id]) {
      elem = originalGetElementById(ID_ALIASES[id]);
    }
    return elem;
  };

  window.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 탐색 (alias 프록시 적용)
    const scheduleForm = document.getElementById('scheduleForm');
    const inputTitle = document.getElementById('title') || document.getElementById('inputTitle');
    const inputDate = document.getElementById('date') || document.getElementById('inputDate');
    const selectCategory = document.getElementById('selectCategory');
    const inputMemo = document.getElementById('inputMemo');
    const addButton = document.getElementById('addButton') || document.getElementById('btnAddSchedule');
    const ddayDisplay = document.getElementById('dday') || document.getElementById('ddayPreviewBadge');

    const scheduleList = document.getElementById('scheduleList') || document.getElementById('schedule-list');
    const emptyState = document.getElementById('emptyState');
    const emptyDescription = document.getElementById('emptyDescription');
    const visibleCountBadge = document.getElementById('visibleCountBadge');
    const selectSort = document.getElementById('selectSort');
    const filterTabs = document.getElementById('filterTabs');
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    // 통계 위젯 DOM
    const statTotal = document.getElementById('statTotal');
    const statUrgent = document.getElementById('statUrgent');
    const statActive = document.getElementById('statActive');
    const statCompleted = document.getElementById('statCompleted');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressBar = document.getElementById('progressBar');

    // 헤더 및 액션 버튼
    const currentDateText = document.getElementById('currentDateText');
    const btnExportTxt = document.getElementById('btnExportTxt');
    const fileInputTxt = document.getElementById('fileInputTxt');
    const btnClearCompleted = document.getElementById('btnClearCompleted');
    const btnResetAll = document.getElementById('btnResetAll');
    const toastContainer = document.getElementById('toastContainer');

    const cardTotal = document.getElementById('cardTotal');
    const cardUrgent = document.getElementById('cardUrgent');
    const cardActive = document.getElementById('cardActive');
    const cardCompleted = document.getElementById('cardCompleted');

    // 로컬 상태
    let currentFilter = 'all';
    let searchQuery = '';
    let currentSort = 'dday-asc';

    function getFormattedDate(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function updateHeaderDate() {
      if (!currentDateText) return;
      const today = new Date();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const date = today.getDate();
      const dayName = days[today.getDay()];
      currentDateText.textContent = `${year}년 ${month}월 ${date}일 (${dayName})`;
    }

    // 대시보드 갱신 함수
    updateDashboard = function () {
      updateStats();
      renderScheduleList();
    };

    function updateStats() {
      const total = globalSchedules.length;
      const completed = globalSchedules.filter(s => s.completed).length;
      const active = total - completed;

      const urgent = globalSchedules.filter(s => {
        if (s.completed) return false;
        const ddayInfo = calculateDday(s.date);
        return ddayInfo.isUrgent && ddayInfo.diffDays >= 0;
      }).length;

      if (statTotal) statTotal.textContent = total;
      if (statUrgent) statUrgent.textContent = urgent;
      if (statActive) statActive.textContent = active;
      if (statCompleted) statCompleted.textContent = completed;

      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      if (progressPercentage) progressPercentage.textContent = `${rate}%`;
      if (progressBar) progressBar.style.width = `${rate}%`;
    }

    function renderScheduleList() {
      if (!scheduleList) return;
      scheduleList.innerHTML = '';

      // 1. 필터
      let filtered = globalSchedules.filter(item => {
        const ddayInfo = calculateDday(item.date);
        if (currentFilter === 'urgent') {
          return !item.completed && ddayInfo.isUrgent && ddayInfo.diffDays >= 0;
        }
        if (currentFilter === 'active') {
          return !item.completed;
        }
        if (currentFilter === 'completed') {
          return item.completed;
        }
        return true;
      });

      // 2. 검색
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item =>
          item.title.toLowerCase().includes(query) ||
          (item.memo && item.memo.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query)) ||
          item.date.includes(query)
        );
      }

      // 3. 정렬
      filtered.sort((a, b) => {
        const ddayA = calculateDday(a.date).diffDays;
        const ddayB = calculateDday(b.date).diffDays;
        if (currentSort === 'dday-asc') return ddayA - ddayB;
        if (currentSort === 'dday-desc') return ddayB - ddayA;
        if (currentSort === 'created-desc') return (b.createdAt || 0) - (a.createdAt || 0);
        if (currentSort === 'title-asc') return a.title.localeCompare(b.title, 'ko');
        return 0;
      });

      if (visibleCountBadge) {
        visibleCountBadge.textContent = `${filtered.length}개`;
      }

      if (filtered.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (emptyDescription) {
          if (searchQuery.trim() !== '') {
            emptyDescription.textContent = `'${searchQuery}' 검색 결과와 일치하는 일정이 없습니다.`;
          } else if (currentFilter === 'urgent') {
            emptyDescription.textContent = '현재 3일 이내에 마감되는 긴급 일정이 없습니다. 여유로운 하루 되세요!';
          } else if (currentFilter === 'completed') {
            emptyDescription.textContent = '아직 완료된 과제가 없습니다. 목표를 완료하고 체크해 보세요!';
          } else if (currentFilter === 'active') {
            emptyDescription.textContent = '진행 중인 과제가 모두 완료되었습니다!';
          } else {
            emptyDescription.textContent = '새로운 과제나 일정을 등록해 보세요!';
          }
        }
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      filtered.forEach(item => {
        const ddayInfo = calculateDday(item.date);
        const li = document.createElement('li');

        let itemClasses = ['schedule-item'];
        if (item.completed) {
          itemClasses.push('item-completed', 'completed');
        } else if (ddayInfo.isToday) {
          itemClasses.push('item-today');
        } else if (ddayInfo.isUrgent && ddayInfo.diffDays > 0) {
          itemClasses.push('item-urgent');
        }

        li.className = itemClasses.join(' ');
        li.dataset.id = item.id;

        const badgeHtml = item.completed
          ? `<span class="badge badge-done"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> 완료</span>`
          : `<span class="badge ${ddayInfo.badgeClass}">${ddayInfo.ddayText}</span>`;

        li.innerHTML = `
          <div class="item-main">
            <label class="checkbox-wrap" title="${item.completed ? '미완료로 변경' : '과제 완료 처리'}">
              <input type="checkbox" class="task-checkbox" data-id="${item.id}" ${item.completed ? 'checked' : ''} aria-label="과제 완료 여부">
            </label>
            <div class="item-content">
              <div class="item-header-meta">
                <span class="category-tag cat-${item.category || '기타'}">${item.category || '과제'}</span>
                <span class="item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
              </div>
              <div class="item-meta-footer">
                <span class="meta-date">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  마감일: ${escapeHtml(item.date)}
                </span>
                ${item.memo ? `<span class="meta-memo" title="${escapeHtml(item.memo)}">💬 ${escapeHtml(item.memo)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="item-actions">
            ${badgeHtml}
            <button class="btn-icon btn-delete" data-id="${item.id}" title="일정 삭제" aria-label="일정 삭제">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `;

        scheduleList.appendChild(li);
      });
    }

    // 일정 추가 핸들러 (폼 submit 및 버튼 직접 click 모두 지원)
    function handleAddSchedule(e) {
      if (e && e.preventDefault) e.preventDefault();

      const title = inputTitle ? inputTitle.value.trim() : '';
      const date = inputDate ? inputDate.value.trim() : '';
      const category = selectCategory ? selectCategory.value : '과제';
      const memo = inputMemo ? inputMemo.value.trim() : '';

      if (!title) {
        showToast('일정 제목을 입력해 주세요.', 'error');
        if (inputTitle) inputTitle.focus();
        return false;
      }

      if (!date) {
        showToast('마감 날짜를 선택해 주세요.', 'error');
        if (inputDate) inputDate.focus();
        return false;
      }

      const newSchedule = {
        id: 'sched_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title,
        date,
        category,
        memo,
        completed: false,
        createdAt: Date.now()
      };

      globalSchedules.unshift(newSchedule);
      saveSchedules(globalSchedules);
      updateDashboard();

      if (inputTitle) inputTitle.value = '';
      if (inputMemo) inputMemo.value = '';
      if (inputDate) {
        inputDate.value = getFormattedDate(1);
        updateDdayPreview(inputDate.value);
      }
      if (inputTitle) inputTitle.focus();

      showToast(`'${title}' 일정이 성공적으로 등록되었습니다!`, 'success');
      return true;
    }

    if (scheduleForm) {
      scheduleForm.addEventListener('submit', handleAddSchedule);
    }
    if (addButton) {
      addButton.addEventListener('click', (e) => {
        // form submit과 중복 실행 방지
        if (e.target && e.target.type === 'submit') return;
        handleAddSchedule(e);
      });
    }

    function updateDdayPreview(dateVal) {
      if (!ddayDisplay) return;
      if (!dateVal) {
        ddayDisplay.textContent = '날짜를 선택하세요';
        ddayDisplay.className = 'badge badge-normal';
        return;
      }
      const ddayInfo = calculateDday(dateVal);
      let previewText = ddayInfo.ddayText;
      if (ddayInfo.isToday) previewText += ' (오늘 마감!)';
      else if (ddayInfo.isUrgent) previewText += ' (마감 임박!)';
      else if (ddayInfo.isPassed) previewText += ' (지나간 날짜)';

      ddayDisplay.textContent = previewText;
      ddayDisplay.className = `badge ${ddayInfo.badgeClass}`;
    }

    if (inputDate) {
      inputDate.addEventListener('input', () => updateDdayPreview(inputDate.value));
      inputDate.addEventListener('change', () => updateDdayPreview(inputDate.value));
    }

    // 일정 목록 클릭 이벤트 위임 (체크박스 완료 및 삭제)
    if (scheduleList) {
      scheduleList.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.task-checkbox');
        if (checkbox) {
          const id = checkbox.dataset.id;
          const target = globalSchedules.find(s => s.id === id);
          if (target) {
            target.completed = checkbox.checked;
            saveSchedules(globalSchedules);
            updateDashboard();
            if (target.completed) {
              showToast(`'${target.title}' 과제를 완료했습니다! 🎉`, 'success');
            }
          }
          return;
        }

        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const target = globalSchedules.find(s => s.id === id);
          if (target) {
            const confirmed = typeof confirm === 'function' ? confirm(`'${target.title}' 일정을 삭제하시겠습니까?`) : true;
            if (confirmed) {
              globalSchedules = globalSchedules.filter(s => s.id !== id);
              saveSchedules(globalSchedules);
              updateDashboard();
              showToast('일정이 삭제되었습니다.', 'info');
            }
          }
          return;
        }
      });
    }

    // 필터 탭
    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab-btn');
        if (!tab) return;
        filterTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderScheduleList();
      });
    }

    function setFilter(filterType) {
      currentFilter = filterType;
      if (filterTabs) {
        filterTabs.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.filter === filterType);
        });
      }
      renderScheduleList();
    }

    if (cardTotal) cardTotal.addEventListener('click', () => setFilter('all'));
    if (cardUrgent) cardUrgent.addEventListener('click', () => setFilter('urgent'));
    if (cardActive) cardActive.addEventListener('click', () => setFilter('active'));
    if (cardCompleted) cardCompleted.addEventListener('click', () => setFilter('completed'));

    // 검색창
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (btnClearSearch) btnClearSearch.style.display = searchQuery ? 'block' : 'none';
        renderScheduleList();
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        if (searchInput) searchInput.focus();
        renderScheduleList();
      });
    }

    if (selectSort) {
      selectSort.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderScheduleList();
      });
    }

    // C++ 호환 TXT 저장
    if (btnExportTxt) {
      btnExportTxt.addEventListener('click', () => {
        if (globalSchedules.length === 0) {
          showToast('저장할 일정이 없습니다.', 'error');
          return;
        }

        const lines = globalSchedules.map(s => {
          const safeTitle = s.title.replace(/\s+/g, '_');
          const ddayText = calculateDday(s.date).ddayText;
          return `${safeTitle} ${s.date} ${ddayText}`;
        });

        const fileContent = lines.join('\r\n');
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schedule.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('C++ 호환 schedule.txt 파일이 저장되었습니다!', 'success');
      });
    }

    // C++ 호환 TXT 불러오기
    if (fileInputTxt) {
      fileInputTxt.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
          try {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

            if (lines.length === 0) {
              showToast('파일에 등록된 일정이 없습니다.', 'error');
              return;
            }

            let importedCount = 0;
            lines.forEach((line, idx) => {
              const tokens = line.trim().split(/\s+/);
              if (tokens.length >= 2) {
                const rawTitle = tokens[0].replace(/_/g, ' ');
                const rawDate = tokens[1];

                let formattedDate = rawDate;
                if (/^\d{1,2}-\d{1,2}$/.test(rawDate)) {
                  const currentYear = new Date().getFullYear();
                  const [m, d] = rawDate.split('-');
                  formattedDate = `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }

                globalSchedules.unshift({
                  id: 'imported_' + Date.now() + '_' + idx,
                  title: rawTitle,
                  date: formattedDate,
                  category: '과제',
                  memo: tokens[2] ? `기존 디데이: ${tokens[2]}` : '',
                  completed: false,
                  createdAt: Date.now()
                });
                importedCount++;
              }
            });

            saveSchedules(globalSchedules);
            updateDashboard();
            showToast(`${importedCount}개의 일정을 성공적으로 불러왔습니다!`, 'success');
          } catch (err) {
            console.error('파일 파싱 에러:', err);
            showToast('schedule.txt 파일 파싱 중 오류가 발생했습니다.', 'error');
          } finally {
            fileInputTxt.value = '';
          }
        };
        reader.readAsText(file, 'utf-8');
      });
    }

    if (btnClearCompleted) {
      btnClearCompleted.addEventListener('click', () => {
        const completedCount = globalSchedules.filter(s => s.completed).length;
        if (completedCount === 0) {
          showToast('정리할 완료 항목이 없습니다.', 'info');
          return;
        }
        if (confirm(`완료된 ${completedCount}개의 일정을 삭제하시겠습니까?`)) {
          globalSchedules = globalSchedules.filter(s => !s.completed);
          saveSchedules(globalSchedules);
          updateDashboard();
          showToast(`${completedCount}개의 완료 항목이 정리되었습니다.`, 'success');
        }
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('모든 일정을 초기화하고 기본 예시 일정으로 되돌리시겠습니까?')) {
          globalSchedules = getDefaultSchedules();
          saveSchedules(globalSchedules);
          updateDashboard();
          showToast('일정 데이터가 기본값으로 복원되었습니다.', 'info');
        }
      });
    }

    function showToast(message, type = 'info') {
      if (!toastContainer) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      let iconSvg = '';
      if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else if (type === 'error') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E11D48" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
      } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
      }

      toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(16px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 2600);
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // 초기화 실행
    updateHeaderDate();
    if (inputDate) {
      inputDate.value = getFormattedDate(1);
      inputDate.min = getFormattedDate(-365);
      updateDdayPreview(inputDate.value);
    }
    updateDashboard();
  });
}

// ==========================================
// 6. Node.js & 브라우저 전역 노출
// ==========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Schedule,
    calculateDday,
    calculateDDay: calculateDday,
    getDday,
    addSchedule,
    showSchedules,
    saveSchedules,
    saveToFile,
    loadSchedules
  };
}

if (typeof window !== 'undefined') {
  window.Schedule = Schedule;
  window.calculateDday = calculateDday;
  window.calculateDDay = calculateDday;
  window.getDday = getDday;
  window.addSchedule = addSchedule;
  window.showSchedules = showSchedules;
  window.saveSchedules = saveSchedules;
  window.saveToFile = saveToFile;
  window.loadSchedules = loadSchedules;
}
