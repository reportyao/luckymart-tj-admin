'''
import React, { useState, useEffect } from 'react';
import { getUsers, updateUserLevel, updateUserCommissionRate, User } from '../services/UserService';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const userList = await getUsers();
      setUsers(userList);
    };
    fetchUsers();
  }, []);

  const handleLevelChange = async (userId: string, newLevel: number) => {
    await updateUserLevel(userId, newLevel);
    // Optionally, refresh the user list or update the local state
  };

  const handleCommissionRateChange = async (userId: string, newCommissionRate: number) => {
    await updateUserCommissionRate(userId, newCommissionRate);
    // Optionally, refresh the user list or update the local state
  };

  return (
    <div>
      <h1>User Management</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Level</th>
            <th>Commission Rate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>
                <input
                  type="number"
                  defaultValue={user.level}
                  onBlur={(e) => handleLevelChange(user.id, parseInt(e.target.value, 10))}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={user.commission_rate}
                  onBlur={(e) => handleCommissionRateChange(user.id, parseFloat(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagementPage;
'''
