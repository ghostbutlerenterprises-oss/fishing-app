import React, { useEffect, useState } from 'react';
import { catchesAPI } from '../services/api';

export default function CatchHistoryPage() {
      const [catches, setCatches] = useState([]);
        const [loading, setLoading] = useState(true);
          const [filterSpecies, setFilterSpecies] = useState('');
            const [message, setMessage] = useState({ type: '', text: '' });

              useEffect(() => {
                    fetchCatches();
              }, []);

                const fetchCatches = async () => {
                        try {
                                  setLoading(true);
                                        const data = await catchesAPI.getAll();
                                              setCatches(data);
                        } catch (error) {
                                  setMessage({ type: 'error', text: 'Failed to load catch history' });
                        } finally {
                                  setLoading(false);
                        }
                };

                  const handleDelete = async (id) => {
                        if (!window.confirm('Are you sure you want to delete this catch?')) {
                                  return;
                        }

                            try {
                                      await catchesAPI.delete(id);
                                            setCatches(catches.filter(c => c.id !== id));
                                                  setMessage({ type: 'success', text: 'Catch deleted successfully' });
                                                        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                            } catch (error) {
                                      setMessage({ type: 'error', text: 'Failed to delete catch' });
                            }
                  };

                    const filteredCatches = filterSpecies
                        ? catches.filter(c => c.species.toLowerCase().includes(filterSpecies.toLowerCase()))
                            : catches;

                              return (
                                    <div className="max-w-6xl mx-auto p-6">
                                          <h2 className="text-3xl font-bold mb-6">Catch History</h2>

                                                {message.text && (
                                                            <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                      {message.text}
                                                                              </div>
                                                )}

                                                      <div className="mb-6 flex gap-4">
                                                              <input
                                                                        type="text"
                                                                                  placeholder="Filter by species..."
                                                                                            value={filterSpecies}
                                                                                                      onChange={(e) => setFilterSpecies(e.target.value)}
                                                                                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                                                        />
                                                                                                                                <button
                                                                                                                                          onClick={fetchCatches}
                                                                                                                                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                                                                                                                            >
                                                                                                                                                                      Refresh
                                                                                                                                                                              </button>
                                                                                                                                                                                    </div>

                                                                                                                                                                                          {loading ? (
                                                                                                                                                                                                    <p className="text-center text-gray-600">Loading...</p>
                                                                                                                                                                                          ) : filteredCatches.length === 0 ? (
                                                                                                                                                                                                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                                                                                                                                                                                                              <p className="text-gray-600">No catches found</p>
                                                                                                                                                                                                                      </div>
                                                                                                                                                                                          ) : (
                                                                                                                                                                                                    <div className="overflow-x-auto">
                                                                                                                                                                                                              <table className="w-full bg-white rounded-lg shadow overflow-hidden">
                                                                                                                                                                                                                          <thead className="bg-gray-100 border-b">
                                                                                                                                                                                                                                        <tr>
                                                                                                                                                                                                                                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Species</th>
                                                                                                                                                                                                                                                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Weight (lbs)</th>
                                                                                                                                                                                                                                                                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Length (in)</th>
                                                                                                                                                                                                                                                                                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                                                                                                                                                                                                                                                                                                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                                                                                                                                                                                                                                                                                                                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                                                                                                                                                                                                                                                                                                                                      </tr>
                                                                                                                                                                                                                                                                                                                                                                  </thead>
                                                                                                                                                                                                                                                                                                                                                                              <tbody>
                                                                                                                                                                                                                                                                                                                                                                                            {filteredCatches.map((catchRecord) => (
                                                                                                                                                                                                                                                                                                                                                                                                                <tr key={catchRecord.id} className="border-b hover:bg-gray-50 transition">
                                                                                                                                                                                                                                                                                                                                                                                                                                  <td className="px-6 py-4 text-sm text-gray-900">{catchRecord.species}</td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                    <td className="px-6 py-4 text-sm text-gray-900">{parseFloat(catchRecord.weight).toFixed(1)}</td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <td className="px-6 py-4 text-sm text-gray-900">{parseFloat(catchRecord.length).toFixed(1)}</td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <td className="px-6 py-4 text-sm text-gray-900">{catchRecord.location}</td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <td className="px-6 py-4 text-sm text-gray-600">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              {new Date(catchRecord.created_at).toLocaleDateString()}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <td className="px-6 py-4 text-center">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <button
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            onClick={() => handleDelete(catchRecord.id)}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      >
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            Delete
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </tr>
                                                                                                                                                                                                                                                                                                                                                                                            ))}
                                                                                                                                                                                                                                                                                                                                                                                                        </tbody>
                                                                                                                                                                                                                                                                                                                                                                                                                  </table>
                                                                                                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                          )}
                                                                                                                                                                                              </div>
                              );
}
                                                                                                                                                                                                                                                                                                                                                                                            ))}
                                                                                                                                                                                          )
                                                                                                                                                                                          )
                                                                                                                                                                                          )}
                                                )}
                              )
                            }
                            }
                        }
                  }
                        }
                        }
                        }
                }
              })
}