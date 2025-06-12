'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState('testing')
  const [databaseInfo, setDatabaseInfo] = useState(null)
  const [tableCount, setTableCount] = useState(null)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState('account_type')
  const [tableData, setTableData] = useState([])
  const [emailStatus, setEmailStatus] = useState('')
  const [isEmailSending, setIsEmailSending] = useState(false)

  // Available tables for selection
  const availableTables = [
    { value: 'account_type', label: 'Account Types' },
    { value: 'nationality', label: 'Nationalities' },
    { value: 'gender', label: 'Genders' },
    { value: 'job_type', label: 'Job Types' },
    { value: 'category_field', label: 'Category Fields' },
    { value: 'job_category', label: 'Job Categories' },
    { value: 'job_seeker_experience_level', label: 'Experience Levels' },
    { value: 'job_seeker_education_level', label: 'Education Levels' },
    { value: 'company', label: 'Companies' },
    { value: 'job', label: 'Jobs' }
  ]

  useEffect(() => {
    testConnection()
  }, [])

  useEffect(() => {
    if (connectionStatus === 'connected') {
      fetchTableData()
    }
  }, [selectedTable, connectionStatus])

  const testConnection = async () => {
    try {
      setConnectionStatus('testing')
      setError(null)

      // Test basic connection by checking if we can access the database
      const { data, error: connectionError } = await supabase
        .from('account_type')
        .select('count', { count: 'exact', head: true })

      if (connectionError) {
        throw connectionError
      }

      // If we get here, connection is successful
      setConnectionStatus('connected')
      
      // Get some basic database information
      const { data: accountTypes, error: accountError } = await supabase
        .from('account_type')
        .select('*')

      if (!accountError) {
        setDatabaseInfo({
          accountTypes: accountTypes || [],
          url: process.env.NEXT_PUBLIC_SUPABASE_URL
        })
      }

      // Try to get a count of some tables to verify schema
      const { count } = await supabase
        .from('account_type')
        .select('*', { count: 'exact', head: true })

      setTableCount(count)

    } catch (err) {
      console.error('Connection test failed:', err)
      setConnectionStatus('failed')
      setError(err.message)
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'testing': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ Connected Successfully'
      case 'failed': return '❌ Connection Failed'
      case 'testing': return '🔄 Testing Connection...'
      default: return '⏳ Initializing...'
    }
  }

  const fetchTableData = async () => {
    try {
      // Get data and count from selected table
      const { data, error, count } = await supabase
        .from(selectedTable)
        .select('*', { count: 'exact' })
        .limit(10)

      if (error) {
        console.error(`Error fetching ${selectedTable} data:`, error)
        setTableData([])
        setTableCount(0)
        return
      }

      setTableData(data || [])
      setTableCount(count)
    } catch (err) {
      console.error(`Failed to fetch ${selectedTable} data:`, err)
      setTableData([])
      setTableCount(0)
    }
  }

  const sendTestEmail = async () => {
    setIsEmailSending(true)
    setEmailStatus('')

    try {
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionStatus,
          selectedTable,
          tableData,
          tableCount
        })
      })

      const result = await response.json()

      if (result.success) {
        setEmailStatus(`✅ ${result.message} Sent to: ${result.recipient}`)
      } else {
        setEmailStatus(`❌ ${result.message}: ${result.error}`)
      }
    } catch (error) {
      setEmailStatus(`❌ Failed to send email: ${error.message}`)
    } finally {
      setIsEmailSending(false)
    }
  }

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value)
  }

  const renderTableData = () => {
    if (!tableData || tableData.length === 0) {
      return <p className="text-gray-600">No data found in the {selectedTable} table.</p>
    }

    const headers = Object.keys(tableData[0])
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200">
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index} className="border-b border-gray-300">
                {headers.map((header) => (
                  <td key={header} className="px-4 py-2 text-sm text-gray-800">
                    {row[header] !== null ? String(row[header]) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Supabase Connection Test
            </h1>

            {/* Connection Status */}
            <div className="mb-8">
              <div className={`inline-flex items-center px-4 py-2 rounded-full font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </div>
            </div>

            {/* Database Information */}
            {connectionStatus === 'connected' && databaseInfo && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Database Information</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-600">Database URL:</span>
                      <p className="text-sm text-gray-800 break-all">
                        {databaseInfo.url ? `${databaseInfo.url.substring(0, 30)}...` : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Records in {selectedTable}:</span>
                      <p className="text-sm text-gray-800">
                        {tableCount !== null ? `${tableCount} records` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table Selection */}
            {connectionStatus === 'connected' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Table to Display</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4">
                    <label htmlFor="table-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Choose a table:
                    </label>
                    <select
                      id="table-select"
                      value={selectedTable}
                      onChange={handleTableChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {availableTables.map((table) => (
                        <option key={table.value} value={table.value}>
                          {table.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Table Data */}
            {connectionStatus === 'connected' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Sample Data from {availableTables.find(t => t.value === selectedTable)?.label} Table
                  {tableCount && <span className="text-sm text-gray-600 ml-2">({tableCount} total records, showing first 10)</span>}
                </h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {renderTableData()}
                </div>
              </div>
            )}

            {/* Email Functionality */}
            {connectionStatus === 'connected' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Send Test Email</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-4">
                    Send a test email with connection status and current table data to the configured receiver email.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <button
                      onClick={sendTestEmail}
                      disabled={isEmailSending}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEmailSending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send Test Email
                        </>
                      )}
                    </button>
                    {emailStatus && (
                      <div className="flex-1">
                        <div className={`p-3 rounded-md text-sm ${
                          emailStatus.startsWith('✅') 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {emailStatus}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-red-800 mb-4">Error Details</h2>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
                </div>
              </div>
            )}

            {/* Test Again Button */}
            <div className="text-center">
              <button
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection Again'}
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Enhanced Connection Test Features:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Connects to your Supabase database using environment variables</li>
                <li>• Allows selection from multiple database tables via dropdown</li>
                <li>• Displays dynamic sample data from the selected table (up to 10 records)</li>
                <li>• Shows total record count for each selected table</li>
                <li>• Sends test emails with connection status and table data</li>
                <li>• Provides detailed error information if connection fails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
