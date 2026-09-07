import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../styles/Home.module.css';

const CATEGORIES = ['샘플링', '코딩', '불만', '제품설명회'];

export default function Home() {
  const [distributors, setDistributors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [reports, setReports] = useState([]);
  
  const [selectedDist, setSelectedDist] = useState(null);
  const [selectedHosp, setSelectedHosp] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  
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

  return (
    <div className={styles.container}>
      <h1>Daily Report Management</h1>
      
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
              <h3>방문 이력</h3>
              {reports.length === 0 ? (
                <p className={styles.empty}>기록 없음</p>
              ) : (
                reports.map(report => (
                  <div key={report.id} className={styles.historyItem}>
                    <div className={styles.historyDate}>{report.date}</div>
                    <div className={styles.historyCategory}>{report.category}</div>
                    <div className={styles.historyDetail}>
                      {report.department} / {report.doctor_name}
                    </div>
                    <div className={styles.historyContent}>{report.content || '(내용 없음)'}</div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteReport(report.id)}
                    >
                      삭제
                    </button>
                  </div>
                ))
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
    </div>
  );
}
