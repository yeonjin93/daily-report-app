import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../styles/Home.module.css';
import { eachDayOfInterval, startOfMonth, endOfMonth, format, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

const CATEGORIES = ['샘플링', '코딩', '불만', '제품설명회', '피드백', '정기방문', '수술참관', '기타'];

export default function Home() {
  const [tab, setTab] = useState('report');
  const [distributors, setDistributors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [reports, setReports] = useState([]);
  
  const [selectedDist, setSelectedDist] = useState(null);
  const [selectedHosp, setSelectedHosp] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedDistHistory, setSelectedDistHistory] = useState(null);
  const [selectedHospHistory, setSelectedHospHistory] = useState(null);
  const [historyReports, setHistoryReports] = useState([]);
  const [searchHistory, setSearchHistory] = useState('');
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allReports, setAllReports] = useState({});
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarReports, setCalendarReports] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  const [searchDist, setSearchDist] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    department: '',
    doctorName: '',
    content: ''
  });

  useEffect(() => {
    loadDistributors();
  }, []);

  useEffect(() => {
    if (selectedDist) {
      loadHospitals(selectedDist.id);
    }
  }, [selectedDist]);

  useEffect(() => {
    if (selectedHosp) {
      loadReports(selectedHosp.id);
    }
  }, [selectedHosp]);

  useEffect(() => {
    if (selectedDistHistory) {
      loadHospitalsHistory(selectedDistHistory.id);
    }
  }, [selectedDistHistory]);

  useEffect(() => {
    if (selectedHospHistory) {
      loadHistoryReports(selectedHospHistory.id);
    }
  }, [selectedHospHistory]);

  useEffect(() => {
    loadCalendarData(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    loadCalendarReports(selectedCalendarDate);
  }, [selectedCalendarDate]);

  const loadDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
      alert('대리점 로드 실패: ' + error.message);
    }
  };

  const loadHospitals = async (distId) => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('distributor_id', distId)
        .order('name');
      
      if (error) throw error;
      setHospitals(data || []);
      setSelectedHosp(null);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const loadHospitalsHistory = async (distId) => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('distributor_id', distId)
        .order('name');
      
      if (error) throw error;
      setHospitals(data || []);
      setSelectedHospHistory(null);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const loadReports = async (hospId) => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('hospital_id', hospId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadHistoryReports = async (hospId) => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('hospital_id', hospId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setHistoryReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadCalendarData = async (date) => {
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, distributors(name), hospitals(name)')
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const reportsByDate = {};
      data.forEach(report => {
        if (!reportsByDate[report.date]) {
          reportsByDate[report.date] = [];
        }
        reportsByDate[report.date].push(report);
      });
      
      setAllReports(reportsByDate);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadCalendarReports = async (date) => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, distributors(name), hospitals(name)')
        .eq('date', date)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setCalendarReports(data || []);
    } catch (error) {
      console.error('Error loading calendar reports:', error);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedDist || !selectedHosp || !selectedCat) {
      alert('대리점, 병원, 카테고리를 모두 선택해주세요!');
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_reports')
        .insert([{
          date: formData.date,
          distributor_id: selectedDist.id,
          hospital_id: selectedHosp.id,
          department: formData.department,
          doctor_name: formData.doctorName,
          category: selectedCat,
          content: formData.content
        }]);

      if (error) throw error;
      
      alert('저장되었습니다!');
      clearForm();
      loadReports(selectedHosp.id);
      loadCalendarData(currentMonth);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('저장 실패: ' + error.message);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      if (selectedHosp) {
        loadReports(selectedHosp.id);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('삭제 실패: ' + error.message);
    }
  };

  const handleEditReport = (report) => {
    setSelectedDist({ id: report.distributor_id, name: report.distributors?.name });
    setSelectedHosp({ id: report.hospital_id, name: report.hospitals?.name });
    setFormData({
      date: report.date,
      department: report.department,
      doctorName: report.doctor_name,
      content: report.content
    });
    setSelectedCat(report.category);
    setEditingId(report.id);
    setTab('report');
  };

const handleUpdateReport = async () => {
    if (!selectedDist || !selectedHosp || !selectedCat || !editingId) {
      alert('모든 필드를 입력해주세요!');
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_reports')
        .update({
          date: formData.date,
          department: formData.department,
          doctor_name: formData.doctorName,
          category: selectedCat,
          content: formData.content
        })
        .eq('id', editingId);

      if (error) throw error;
      
      alert('수정되었습니다!');
      setEditingId(null);
      clearForm();
      loadHistoryReports(selectedHospHistory.id);
      loadCalendarData(currentMonth);
    } catch (error) {
      console.error('Error updating report:', error);
      alert('수정 실패: ' + error.message);
    }
  };

const handleDeleteReport = async (reportId) => {
  const handleDeleteHistoryReport = async (reportId) => {
    console.log('삭제 시도:', reportId);
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      if (selectedHospHistory) {
        loadHistoryReports(selectedHospHistory.id);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('삭제 실패: ' + error.message);
    }
  };

  const handleDeleteCalendarReport = async (reportId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      loadCalendarData(currentMonth);
      loadCalendarReports(selectedCalendarDate);
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('삭제 실패: ' + error.message);
    }
  };

  const downloadCSV = () => {
    if (historyReports.length === 0) {
      alert('다운로드할 데이터가 없습니다!');
      return;
    }

    const headers = ['날짜', '대리점', '병원', '과', '의료진', '카테고리', '내용'];
    const rows = historyReports.map(r => [
      r.date,
      selectedDistHistory?.name || '',
      selectedHospHistory?.name || '',
      r.department || '',
      r.doctor_name || '',
      r.category,
      r.content || ''
    ]);

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `방문기록_${selectedHospHistory?.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

const downloadCalendarCSV = () => {
    if (calendarReports.length === 0) {
      alert('다운로드할 데이터가 없습니다!');
      return;
    }

    const headers = ['대리점', '병원', '카테고리', '과', '의료진', '내용'];
    const rows = calendarReports.map(r => [
      r.distributors?.name || '',
      r.hospitals?.name || '',
      r.category,
      r.department || '',
      r.doctor_name || '',
      r.content || ''
    ]);

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `방문기록_${selectedCalendarDate}.csv`;
    link.click();
  };

  const clearForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      department: '',
      doctorName: '',
      content: ''
    });
    setSelectedCat(null);
  };

  const filteredDistributors = distributors.filter(d => 
    d.name.toLowerCase().includes(searchDist.toLowerCase())
  );

  const filteredHistoryReports = historyReports.filter(r =>
    r.date.includes(searchHistory) ||
    r.department.toLowerCase().includes(searchHistory.toLowerCase()) ||
    r.doctor_name.toLowerCase().includes(searchHistory.toLowerCase())
  );

  // 캘린더 렌더링
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return (
      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>←</button>
          <h2>{format(currentMonth, 'yyyy년 M월', { locale: ko })}</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>→</button>
        </div>
        
        <div className={styles.calendarWeekdays}>
          <div>일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div>토</div>
        </div>
        
        <div className={styles.calendarDays}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className={styles.calendarWeek}>
              {week.map(day => {
                const dateStr = day.toISOString().split('T')[0];
                const dayReports = allReports[dateStr] || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = dateStr === selectedCalendarDate;
                
                return (
                  <div
                    key={dateStr}
                    className={`${styles.calendarDay} ${!isCurrentMonth ? styles.otherMonth : ''} ${isSelected ? styles.selectedDay : ''}`}
                    onClick={() => setSelectedCalendarDate(dateStr)}
                  >
                    <div className={styles.dayNumber}>{format(day, 'd')}</div>
                    {dayReports.length > 0 && (
                      <div className={styles.reportCount}>
                        {dayReports.map((r, idx) => (
                          <div key={idx} className={styles.reportBadge} title={r.hospitals?.name}>
                            {r.category}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <h1>Daily Report Management</h1>
      
      <div className={styles.tabBar}>
        <button 
          className={`${styles.tabBtn} ${tab === 'report' ? styles.tabActive : ''}`}
          onClick={() => setTab('report')}
        >
          📝 Daily Report 입력
        </button>
        <button 
          className={`${styles.tabBtn} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setTab('history')}
        >
          📋 방문 이력 조회
        </button>
        <button 
          className={`${styles.tabBtn} ${tab === 'calendar' ? styles.tabActive : ''}`}
          onClick={() => setTab('calendar')}
        >
          📅 캘린더 조회
        </button>
      </div>

      {tab === 'report' && (
        <div className={styles.layout}>
          <div className={styles.panel}>
            <h2>대리점</h2>
            <input
              type="text"
              placeholder="검색..."
              value={searchDist}
              onChange={(e) => setSearchDist(e.target.value)}
              className={styles.searchBox}
            />
            <div className={styles.list}>
              {filteredDistributors.map(dist => (
                <div
                  key={dist.id}
                  className={`${styles.listItem} ${selectedDist?.id === dist.id ? styles.active : ''}`}
                  onClick={() => setSelectedDist(dist)}
                >
                  {dist.name}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <h2>{selectedDist ? selectedDist.name + ' - 병원' : '병원 선택'}</h2>
            <div className={styles.list}>
              {hospitals.map(hosp => (
                <div
                  key={hosp.id}
                  className={`${styles.listItem} ${selectedHosp?.id === hosp.id ? styles.active : ''}`}
                  onClick={() => setSelectedHosp(hosp)}
                >
                  {hosp.name}
                </div>
              ))}
            </div>
            
            {selectedHosp && (
              <div className={styles.history}>
                <h3>방문 이력 (요약)</h3>
                {reports.length === 0 ? (
                  <p className={styles.empty}>기록 없음</p>
                ) : (
                  reports.slice(0, 3).map(report => (
                    <div key={report.id} className={styles.historyItem}>
                      <div className={styles.historyDate}>{report.date}</div>
                      <div className={styles.historyCategory}>{report.category}</div>
                    </div>
                  ))
                )}
                {reports.length > 3 && (
                  <p className={styles.moreInfo}>
                    외 {reports.length - 3}개 기록 → "이력 조회"에서 확인
                  </p>
                )}
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <h2>Daily Report</h2>
            
            <div className={styles.formGroup}>
              <label>날짜</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>대리점</label>
              <input
                type="text"
                disabled
                value={selectedDist?.name || ''}
              />
            </div>

            <div className={styles.formGroup}>
              <label>병원</label>
              <input
                type="text"
                disabled
                value={selectedHosp?.name || ''}
              />
            </div>

            <div className={styles.formGroup}>
              <label>과 (Department)</label>
              <input
                type="text"
                placeholder="e.g., Stomach, Colon..."
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>의료진 (Doctor Name)</label>
              <input
                type="text"
                placeholder="의사 이름"
                value={formData.doctorName}
                onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>카테고리</label>
              <div className={styles.chipGroup}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`${styles.chip} ${selectedCat === cat ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCat(selectedCat === cat ? null : cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>내용</label>
              <textarea
                placeholder="방문 내용, 피드백..."
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                rows={5}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button className={styles.btnPrimary} onClick={handleSaveReport}>
                저장
              </button>
              <button className={styles.btnSecondary} onClick={clearForm}>
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className={styles.historyLayout}>
          <div className={styles.historySidebar}>
            <h2>대리점 선택</h2>
            <div className={styles.list}>
              {distributors.map(dist => (
                <div
                  key={dist.id}
                  className={`${styles.listItem} ${selectedDistHistory?.id === dist.id ? styles.active : ''}`}
                  onClick={() => setSelectedDistHistory(dist)}
                >
                  {dist.name}
                </div>
              ))}
            </div>

            <h2 style={{marginTop: '20px'}}>병원 선택</h2>
            <div className={styles.list}>
              {hospitals.map(hosp => (
                <div
                  key={hosp.id}
                  className={`${styles.listItem} ${selectedHospHistory?.id === hosp.id ? styles.active : ''}`}
                  onClick={() => setSelectedHospHistory(hosp)}
                >
                  {hosp.name}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.historyContentPanel}>
            <div className={styles.historyHeader}>
              <h2>{selectedHospHistory ? selectedHospHistory.name + ' - 전체 기록' : '병원을 선택해주세요'}</h2>
              {selectedHospHistory && (
                <button className={styles.downloadBtn} onClick={downloadCSV}>
                  📥 CSV 다운로드
                </button>
              )}
            </div>

            {selectedHospHistory && (
              <input
                type="text"
                placeholder="날짜, 과, 의료진으로 검색..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className={styles.searchBoxHistory}
              />
            )}

            {selectedHospHistory ? (
              <div className={styles.historyTable}>
                {filteredHistoryReports.length === 0 ? (
                  <p className={styles.empty}>기록이 없습니다</p>
                ) : (
                  <>
                    <div className={styles.tableHeader}>
                      <div className={styles.col1}>날짜</div>
                      <div className={styles.col2}>카테고리</div>
                      <div className={styles.col3}>과</div>
                      <div className={styles.col4}>의료진</div>
                      <div className={styles.col5}>내용</div>
                      <div className={styles.col6}>삭제</div>
                    </div>
                    {filteredHistoryReports.map(report => (
                      <div key={report.id} className={styles.tableRow}>
                        <div className={styles.col1}>{report.date}</div>
                        <div className={styles.col2}>
                          <span className={styles.categoryBadge}>{report.category}</span>
                        </div>
                        <div className={styles.col3}>{report.department}</div>
                        <div className={styles.col4}>{report.doctor_name}</div>
                        <div className={styles.col5}>{report.content}</div>
                        <div className={styles.col6}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteHistoryReport(report.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : (
              <p className={styles.empty} style={{marginTop: '40px'}}>왼쪽에서 대리점과 병원을 선택해주세요</p>
            )}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className={styles.calendarContainer}>
          <div className={styles.calendarLeft}>
            {renderCalendar()}
          </div>

          <div className={styles.calendarRight}>
            <div className={styles.historyHeader}>
              <h2>{selectedCalendarDate} - 방문 기록</h2>
              {calendarReports.length > 0 && (
                <button className={styles.downloadBtn} onClick={downloadCalendarCSV}>
                  📥 CSV 다운로드
                </button>
              )}
            </div>

            <div className={styles.historyTable}>
              {calendarReports.length === 0 ? (
                <p className={styles.empty}>이 날짜에 기록이 없습니다</p>
              ) : (
                <>
                  <div className={styles.tableHeader}>
                    <div className={styles.colDist}>대리점</div>
                    <div className={styles.colHosp}>병원</div>
                    <div className={styles.colCat}>카테고리</div>
                    <div className={styles.colDept}>과</div>
                    <div className={styles.colDoc}>의료진</div>
                    <div className={styles.colCon}>내용</div>
                  </div>
                  {calendarReports.map(report => (
                    <div key={report.id} className={styles.tableRow}>
                      <div className={styles.colDist}>{report.distributors?.name}</div>
                      <div className={styles.colHosp}>{report.hospitals?.name}</div>
                      <div className={styles.colCat}>
                        <span className={styles.categoryBadge}>{report.category}</span>
                      </div>
                      <div className={styles.colDept}>{report.department}</div>
                      <div className={styles.colDoc}>{report.doctor_name}</div>
                      <div className={styles.colCon}>{report.content}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
