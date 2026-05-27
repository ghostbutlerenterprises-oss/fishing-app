import React, { useEffect, useState } from 'react';
import { catchesAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalCatches: 0, totalWeight: 0 });
    const [loading, setLoading] = useState(true);

      useEffect(() => {
          const fetchStats = async () => {
                try {
                        const data = await catchesAPI.getAll();
                                setStats({
                                          totalCatches: data.length,
                                                    totalWeight: data.reduce((sum, c) => sum + (c.weight || 0), 0)
                                                            });
                                                                  } catch (error) {
                                                                          console.error('Failed to fetch stats:', error);
                                                                                } finally {
                                                                                        setLoading(false);
                                                                                              }
                                                                                                  };
                                                                                                      fetchStats();
                                                                                                        }, []);

                                                                                                          return (
                                                                                                              <div className="max-w-7xl mx-auto p-6">
                                                                                                                    <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
                                                                                                                          
                                                                                                                                {loading ? (
                                                                                                                                        <p>Loading...</p>
                                                                                                                                              ) : (
                                                                                                                                                      <div className="grid grid-cols-2 gap-4">
                                                                                                                                                                <div className="bg-white p-6 rounded-lg shadow">
                                                                                                                                                                            <h3 className="text-lg font-semibold mb-2">Total Catches</h3>
                                                                                                                                                                                        <p className="text-4xl font-bold text-blue-600">{stats.totalCatches}</p>
                                                                                                                                                                                                  </div>
                                                                                                                                                                                                            <div className="bg-white p-6 rounded-lg shadow">
                                                                                                                                                                                                                        <h3 className="text-lg font-semibold mb-2">Total Weight (lbs)</h3>
                                                                                                                                                                                                                                    <p className="text-4xl font-bold text-blue-600">{stats.totalWeight.toFixed(2)}</p>
                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                            )}
                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                  );
                                                                                                                                                                                                                                                                  }