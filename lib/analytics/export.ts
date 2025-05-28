/**
 * Utilities for exporting analytics data
 */

// Function to convert JSON data to CSV
export function jsonToCsv(data: any[], fields?: string[]): string {
  if (!data || data.length === 0) return '';
  
  // If fields are not provided, use all keys from the first object
  const headers = fields || Object.keys(data[0]);
  
  // Create CSV header row
  const csvRows = [
    headers.join(',')
  ];
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      
      // Handle different data types for CSV
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      } else {
        return value;
      }
    });
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Function to download CSV data
export function downloadCsv(csvData: string, filename: string): void {
  if (typeof window === 'undefined') return; // SSR check
  
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility function to format dates for CSV export
export function formatDateForExport(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Function to export video analytics data
export function exportVideoAnalytics(videoId: string, period: string, data: any): void {
  // Format the filename
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `video-analytics-${videoId}-${period}-${timestamp}.csv`;
  
  // Prepare the data for export
  const exportData = [
    {
      Video_ID: videoId,
      Title: data.video?.title || 'Unknown',
      Total_Views: data.metrics?.totalViews || 0,
      Unique_Views: data.metrics?.uniqueViews || 0,
      Total_Shares: data.metrics?.totalShares || 0,
      Total_Embeds: data.metrics?.totalEmbeds || 0,
      Total_Downloads: data.metrics?.totalDownloads || 0,
      Embed_Views: data.metrics?.embedViews || 0,
      Period: period,
      Export_Date: new Date().toISOString()
    }
  ];
  
  // Convert to CSV
  const csvData = jsonToCsv(exportData);
  
  // Download
  downloadCsv(csvData, filename);
}

// Function to export time series data
export function exportTimeSeriesData(videoId: string, period: string, timeSeriesData: any[]): void {
  // Format the filename
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `video-timeseries-${videoId}-${period}-${timestamp}.csv`;
  
  // Prepare the data for export
  const exportData = timeSeriesData.map(item => ({
    Date: item.timestamp,
    Label: item.label,
    Views: item.views,
    Unique_Views: item.uniqueViews,
    Embed_Views: item.embedViews
  }));
  
  // Convert to CSV
  const csvData = jsonToCsv(exportData);
  
  // Download
  downloadCsv(csvData, filename);
}

// Function to export usage summary data
export function exportUsageSummary(period: string, data: any): void {
  // Format the filename
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `analytics-summary-${period}-${timestamp}.csv`;
  
  // Prepare the data for export
  const exportData = [
    {
      Total_Views: data.totalViews || 0,
      Total_Shares: data.totalShares || 0,
      Total_Embeds: data.totalEmbeds || 0,
      Total_Downloads: data.totalDownloads || 0,
      Total_Videos: data.totalVideos || 0,
      Total_Video_Minutes: data.totalVideoMinutes || 0,
      Total_Projects: data.totalProjects || 0,
      Most_Viewed_Video: data.mostViewedVideo?.title || 'None',
      Most_Viewed_Video_Views: data.mostViewedVideo?.views || 0,
      Most_Shared_Video: data.mostSharedVideo?.title || 'None',
      Most_Shared_Video_Shares: data.mostSharedVideo?.shares || 0,
      Period: period,
      Export_Date: new Date().toISOString()
    }
  ];
  
  // Convert to CSV
  const csvData = jsonToCsv(exportData);
  
  // Download
  downloadCsv(csvData, filename);
} 