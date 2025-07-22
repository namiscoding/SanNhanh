import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import api from '@/lib/api';

export default function AvailabilityCalendar({
  complexId,
  selectedDate,
  onDateChange,
  mode = 'customer' // 'customer' or 'owner'
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityData, setAvailabilityData] = useState(null);

  useEffect(() => {
    if (complexId && selectedDate) {
      fetchAvailability();
    }
  }, [complexId, selectedDate]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/public/court-complexes/${complexId}/availability-grid`, {
        params: { date: selectedDate }
      });

      setAvailabilityData(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Không thể tải lịch trống');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (direction) => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    onDateChange && onDateChange(newDate.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Đang tải lịch...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button 
              onClick={fetchAvailability} 
              variant="outline" 
              className="mt-2"
            >
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!availabilityData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Lịch trống - {availabilityData.complex.name}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeDate(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm font-medium px-3">
              {new Date(selectedDate).toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeDate(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-50 text-left min-w-[100px]">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Thời gian
                  </div>
                </th>
                {availabilityData.courts.map(court => (
                  <th 
                    key={court.courtId} 
                    className="border border-gray-300 p-2 bg-gray-50 text-center min-w-[120px]"
                  >
                    {court.courtName}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {availabilityData.timeSlots.map(timeSlot => (
                <tr key={timeSlot}>
                  <td className="border border-gray-300 p-2 bg-gray-50 font-medium">
                    {timeSlot}
                  </td>
                  {availabilityData.courts.map(court => {
                    const slot = court.slots[timeSlot];
                    
                    return (
                      <td 
                        key={`${court.courtId}-${timeSlot}`}
                        className="border border-gray-300 p-1"
                      >
                        {slot ? (
                          <div
                            className={`w-full h-12 rounded text-xs font-medium transition-colors flex items-center justify-center text-center ${
                              slot.isPast 
                                ? 'bg-gray-200 text-gray-500 border border-gray-300' 
                                : slot.available 
                                ? 'bg-green-100 text-green-800 border border-green-300' 
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                            title={slot.booking ? `Đã đặt bởi: ${slot.booking.customerName}\nThời gian: ${slot.booking.startTime} - ${slot.booking.endTime}` : ''}
                          >
                            {slot.isPast ? (
                              'Đã qua'
                            ) : slot.available ? (
                              'Trống'
                            ) : (
                              <div className="text-center">
                                <div className="truncate">
                                  {slot.booking?.customerName || 'Đã đặt'}
                                </div>
                                {slot.booking && (
                                  <div className="text-xs opacity-75">
                                    {slot.booking.startTime} - {slot.booking.endTime}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-12 bg-gray-100 rounded"></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
            <span>Trống</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
            <span>Đã đặt</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded mr-2"></div>
            <span>Đã qua</span>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Lịch chỉ hiển thị trạng thái sân</p>
          <p>• Mỗi ô tương ứng với 1 giờ</p>
          <p>• Giờ mở cửa: {availabilityData.complex.openTime} - {availabilityData.complex.closeTime}</p>
        </div>
      </CardContent>
    </Card>
  );
}

