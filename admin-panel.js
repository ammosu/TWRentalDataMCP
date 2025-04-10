// 使用React構建API金鑰管理介面
// 這是一個前端應用，需要安裝：
// npm install react react-dom axios react-bootstrap bootstrap @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons

import React, { useState, useEffect }

// 用戶管理元件
function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 表單狀態
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user'
  });
  
  // 獲取所有用戶
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('獲取用戶失敗: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加載
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // 處理表單變更
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // 創建新用戶
  const handleCreateUser = async () => {
    try {
      await api.post('/admin/users', formData);
      fetchUsers();
      setShowCreateModal(false);
      
      // 重置表單
      setFormData({
        username: '',
        email: '',
        role: 'user'
      });
    } catch (err) {
      setError('創建用戶失敗: ' + (err.response?.data?.message || err.message));
    }
  };
  
  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">用戶管理</h5>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <FontAwesomeIcon icon={faPlus} /> 添加用戶
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <p>加載中...</p>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>用戶ID</th>
                <th>用戶名</th>
                <th>電子郵件</th>
                <th>角色</th>
                <th>創建日期</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">尚無用戶</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user._id}>
                    <td>{user._id.substring(0, 8)}...</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
      
      {/* 創建用戶模態框 */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>創建新用戶</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>用戶名</Form.Label>
              <Form.Control 
                type="text" 
                name="username" 
                value={formData.username} 
                onChange={handleFormChange}
                placeholder="輸入用戶名"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>電子郵件</Form.Label>
              <Form.Control 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleFormChange}
                placeholder="輸入電子郵件"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>角色</Form.Label>
              <Form.Select 
                name="role" 
                value={formData.role} 
                onChange={handleFormChange}
              >
                <option value="user">普通用戶</option>
                <option value="admin">管理員</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleCreateUser}>
            創建用戶
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}

export default App; from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faKey, faTrash, faCopy, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
const ADMIN_TOKEN = localStorage.getItem('adminToken');

// API請求配置
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
});

function App() {
  return (
    <Container fluid className="p-4">
      <h1 className="mb-4">MCP API管理介面</h1>
      <Row>
        <Col md={8}>
          <ApiKeyManager />
        </Col>
        <Col md={4}>
          <UserManager />
        </Col>
      </Row>
    </Container>
  );
}

// API金鑰管理元件
function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  
  // 表單狀態
  const [formData, setFormData] = useState({
    userId: '',
    permissions: ['read'],
    expiresInDays: 365
  });
  
  // 獲取所有API金鑰
  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/keys');
      setApiKeys(response.data);
      setError(null);
    } catch (err) {
      setError('獲取API金鑰失敗: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加載
  useEffect(() => {
    fetchApiKeys();
  }, []);
  
  // 處理表單變更
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'permissions') {
      // 處理複選框組
      const updatedPermissions = [...formData.permissions];
      if (checked) {
        updatedPermissions.push(value);
      } else {
        const index = updatedPermissions.indexOf(value);
        if (index > -1) {
          updatedPermissions.splice(index, 1);
        }
      }
      setFormData({ ...formData, permissions: updatedPermissions });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'number' ? parseInt(value) : value
      });
    }
  };
  
  // 創建新API金鑰
  const handleCreateKey = async () => {
    try {
      const response = await api.post('/admin/keys', formData);
      setNewKey(response.data);
      fetchApiKeys();
      setShowCreateModal(false);
      setShowKeyModal(true);
      
      // 重置表單
      setFormData({
        userId: '',
        permissions: ['read'],
        expiresInDays: 365
      });
    } catch (err) {
      setError('創建API金鑰失敗: ' + (err.response?.data?.message || err.message));
    }
  };
  
  // 停用API金鑰
  const handleDeactivateKey = async (keyId) => {
    if (window.confirm('確定要停用此API金鑰嗎？')) {
      try {
        await api.patch(`/admin/keys/${keyId}/deactivate`);
        fetchApiKeys();
      } catch (err) {
        setError('停用API金鑰失敗: ' + (err.response?.data?.message || err.message));
      }
    }
  };
  
  // 複製API金鑰到剪貼板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        alert('API金鑰已複製到剪貼板');
      },
      (err) => {
        console.error('無法複製: ', err);
      }
    );
  };
  
  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">API金鑰管理</h5>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <FontAwesomeIcon icon={faPlus} /> 創建新金鑰
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loading ? (
          <p>加載中...</p>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>金鑰ID</th>
                <th>用戶ID</th>
                <th>權限</th>
                <th>狀態</th>
                <th>創建日期</th>
                <th>過期日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">尚無API金鑰</td>
                </tr>
              ) : (
                apiKeys.map(key => (
                  <tr key={key._id}>
                    <td>{key._id.substring(0, 8)}...</td>
                    <td>{key.userId}</td>
                    <td>
                      {key.permissions.map(perm => (
                        <Badge key={perm} bg="info" className="me-1">{perm}</Badge>
                      ))}
                    </td>
                    <td>
                      <Badge bg={key.isActive ? 'success' : 'danger'}>
                        {key.isActive ? '啟用' : '停用'}
                      </Badge>
                    </td>
                    <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td>
                      {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : '永不過期'}
                    </td>
                    <td>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        className="me-1"
                        onClick={() => handleDeactivateKey(key._id)}
                        disabled={!key.isActive}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
      
      {/* 創建API金鑰模態框 */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>創建新API金鑰</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>用戶ID</Form.Label>
              <Form.Control 
                type="text" 
                name="userId" 
                value={formData.userId} 
                onChange={handleFormChange}
                placeholder="輸入用戶ID"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>權限</Form.Label>
              <div>
                <Form.Check
                  type="checkbox"
                  id="permission-read"
                  label="讀取 (read)"
                  name="permissions"
                  value="read"
                  checked={formData.permissions.includes('read')}
                  onChange={handleFormChange}
                />
                <Form.Check
                  type="checkbox"
                  id="permission-write"
                  label="寫入 (write)"
                  name="permissions"
                  value="write"
                  checked={formData.permissions.includes('write')}
                  onChange={handleFormChange}
                />
                <Form.Check
                  type="checkbox"
                  id="permission-admin"
                  label="管理 (admin)"
                  name="permissions"
                  value="admin"
                  checked={formData.permissions.includes('admin')}
                  onChange={handleFormChange}
                />
              </div>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>有效期（天）</Form.Label>
              <Form.Control 
                type="number" 
                name="expiresInDays" 
                value={formData.expiresInDays} 
                onChange={handleFormChange}
                min="1"
                max="3650"
              />
              <Form.Text className="text-muted">
                設置為0表示永不過期
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleCreateKey}>
            創建金鑰
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* 顯示新創建的API金鑰模態框 */}
      <Modal show={showKeyModal} onHide={() => setShowKeyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>新API金鑰已創建</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-danger fw-bold">請保存此金鑰！它只會顯示一次。</p>
          <div className="d-flex align-items-center">
            <div className="input-group mb-3">
              <input 
                type={showKey ? "text" : "password"} 
                className="form-control"
                value={newKey?.key || ''}
                readOnly
              />
              <Button 
                variant="outline-secondary"
                onClick={() => setShowKey(!showKey)}
              >
                <FontAwesomeIcon icon={showKey ? faEyeSlash : faEye} />
              </Button>
              <Button 
                variant="outline-secondary"
                onClick={() => copyToClipboard(newKey?.key)}
              >
                <FontAwesomeIcon icon={faCopy} />
              </Button>
            </div>
          </div>
          <div>
            <strong>權限：</strong>
            {newKey?.permissions.map(perm => (
              <Badge key={perm} bg="info" className="me-1">{perm}</Badge>
            ))}
          </div>
          <div>
            <strong>過期日期：</strong> {newKey?.expiresAt ? new Date(newKey.expiresAt).toLocaleDateString() : '永不過期'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowKeyModal(false)}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}