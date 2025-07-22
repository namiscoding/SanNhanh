import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Users, UserCheck, UserX, Crown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import api from '@/lib/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]); // Khởi tạo là mảng rỗng
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const roleOptions = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'Customer', label: 'Khách hàng' },
    { value: 'Owner', label: 'Chủ sân' },
    { value: 'Admin', label: 'Quản trị viên' },
  ];
  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: '1', label: 'Hoạt động' },
    { value: '0', label: 'Đã khóa' },
  ];
  const sortByOptions = [
    { value: 'createdAt', label: 'Ngày tạo' },
    { value: 'fullName', label: 'Tên đầy đủ' },
    { value: 'email', label: 'Email' },
    { value: 'role', label: 'Vai trò' },
    { value: 'accountStatus', label: 'Trạng thái tài khoản' },
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
        ...filters,
      };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined || params[key] === null) {
          delete params[key];
        }
      });
      if (params.status !== undefined) {
        params.status = parseInt(params.status);
      }

      const response = await api.get('/admin/users', { params });
      setUsers(response.data.users || []); // <<< ĐẢM BẢO LÀ MẢNG RỖNG NẾU response.data.users LÀ UNDEFINED
      setTotalPages(response.data.totalPages || 1); // Cung cấp giá trị mặc định
      setTotalItems(response.data.totalItems || 0); // Cung cấp giá trị mặc định
      setCurrentPage(response.data.currentPage || 1); // Cung cấp giá trị mặc định

    } catch (err) {
      console.error('Error fetching users:', err.response?.data?.error || err.message || err);
      setError(err.response?.data?.error || 'Không thể tải danh sách người dùng.');
      setUsers([]); // <<< QUAN TRỌNG: ĐẢM BẢO 'users' LUÔN LÀ MẢNG TRÊN LỖI
      setTotalPages(1); // Reset totalPages về 1 trên lỗi
      setTotalItems(0); // Reset totalItems về 0 trên lỗi
      setCurrentPage(1); // Reset currentPage về 1 trên lỗi

    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, {
        accountStatus: newStatus
      });
      setMessage('Cập nhật trạng thái thành công');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setMessage(err.response?.data?.error || 'Lỗi khi cập nhật trạng thái');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const upgradeUserRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, {
        role: newRole
      });
      setMessage(`Nâng cấp vai trò thành ${newRole} thành công`);
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error upgrading role:', err);
      setMessage(err.response?.data?.error || 'Lỗi khi nâng cấp vai trò');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'destructive';
      case 'Owner': return 'default';
      case 'Customer': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-20 w-20 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý người dùng
        </h1>
        <p className="text-gray-600">
          Xem, lọc, sắp xếp và quản lý tài khoản người dùng, chủ sân, và quản trị viên.
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.includes('thành công') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <AlertDescription className={`${message.includes('thành công') ? 'text-green-800' : 'text-red-800'}`}>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter and Sort Section */}
      <Card className="mb-8 shadow-md rounded-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Search Input */}
            <div>
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <div className="relative">
                <Input
                  id="search-input"
                  name="search"
                  placeholder="Tên, email..."
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
                Vai trò
              </label>
              <select
                id="role-select"
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái tài khoản
              </label>
              <select
                id="status-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="sortBy-select" className="block text-sm font-medium text-gray-700 mb-2">
                Sắp xếp theo
              </label>
              <select
                id="sortBy-select"
                name="sortBy"
                value={filters.sortBy}
                onChange={handleSortChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortByOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sortOrder-select" className="block text-sm font-medium text-gray-700 mb-2">
                Thứ tự
              </label>
              <select
                id="sortOrder-select"
                name="sortOrder"
                value={filters.sortOrder}
                onChange={handleSortChange}
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end lg:col-span-1">
              <Button onClick={() => setFilters({ search: '', role: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' })} variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                Xóa bộ lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
            <Users className="w-5 h-5 mr-2" />
            Danh sách người dùng ({totalItems} người)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <span className="ml-2 text-gray-600">Đang tải người dùng...</span>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg shadow-sm">
                  <div className="flex items-center space-x-4 flex-grow">
                    {user.image ? (
                      <img src={user.image} alt={user.fullName} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{user.fullName}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Tạo: {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-3 md:mt-0">
                    <Badge variant={getRoleBadgeColor(user.role)} className="font-semibold px-3 py-1 text-sm">
                      {user.role}
                    </Badge>
                    
                    <Badge variant={user.accountStatus === 1 ? 'default' : 'destructive'} className="font-semibold px-3 py-1 text-sm">
                      {user.accountStatus === 1 ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>

                    {user.role !== 'Admin' && ( // Admin không thể thay đổi vai trò hoặc trạng thái của Admin khác
                      <div className="flex space-x-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== user.role) {
                              upgradeUserRole(user.id, e.target.value);
                            }
                          }}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          defaultValue=""
                        >
                          <option value="">Đổi vai trò</option>
                          {user.role === 'Customer' && (
                            <>
                              <option value="Owner">Nâng cấp thành Owner</option>
                              <option value="Admin">Nâng cấp thành Admin</option>
                            </>
                          )}
                          {user.role === 'Owner' && (
                            <>
                              <option value="Customer">Hạ cấp thành Customer</option>
                              <option value="Admin">Nâng cấp thành Admin</option>
                            </>
                          )}
                        </select>
                        
                        {user.accountStatus === 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, 0)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Khóa
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, 1)}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Mở khóa
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Không tìm thấy người dùng nào phù hợp.</h3>
              <p className="mb-4">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
              <Button onClick={() => setFilters({ search: '', role: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' })} variant="outline">
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </CardContent>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-4 py-2 text-sm">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminUsers;