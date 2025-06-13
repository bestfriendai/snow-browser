import { useState, useEffect } from "react";
import { DownloadInfo } from "~/flow/interfaces/downloads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FolderOpen, 
  Trash2, 
  Play, 
  Pause, 
  X,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function DownloadsManager() {
  const [downloads, setDownloads] = useState<DownloadInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial downloads
    flow.downloads.getAll().then(setDownloads).finally(() => setLoading(false));

    // Listen for download changes
    const unsubscribe = flow.downloads.onChanged((updatedDownloads) => {
      setDownloads(updatedDownloads);
    });

    return unsubscribe;
  }, []);

  const handleOpenDownload = async (id: string) => {
    await flow.downloads.open(id);
  };

  const handleShowInFolder = async (id: string) => {
    await flow.downloads.showInFolder(id);
  };

  const handleRemoveDownload = async (id: string) => {
    await flow.downloads.remove(id);
  };

  const handleClearCompleted = async () => {
    await flow.downloads.clearCompleted();
  };

  const getFileIcon = (filename: string, mimeType?: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
      return <Image className="h-5 w-5" />;
    }
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension || '')) {
      return <Video className="h-5 w-5" />;
    }
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg'].includes(extension || '')) {
      return <Music className="h-5 w-5" />;
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) {
      return <Archive className="h-5 w-5" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const getStateColor = (state: DownloadInfo['state']) => {
    switch (state) {
      case 'completed':
        return 'bg-green-500';
      case 'progressing':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-gray-500';
      case 'interrupted':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStateBadgeVariant = (state: DownloadInfo['state']) => {
    switch (state) {
      case 'completed':
        return 'default';
      case 'progressing':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      case 'interrupted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgress = (download: DownloadInfo) => {
    if (download.totalBytes === 0) return 0;
    return (download.receivedBytes / download.totalBytes) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Download className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading downloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Downloads</h1>
            <p className="text-muted-foreground">Manage your downloaded files</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClearCompleted}
              disabled={!downloads.some(d => d.state === 'completed')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
          </div>
        </div>

        {downloads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No downloads yet</h3>
              <p className="text-muted-foreground text-center">
                Downloaded files will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {downloads.map((download) => (
              <Card key={download.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getFileIcon(download.filename, download.mimeType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{download.filename}</h3>
                        <Badge variant={getStateBadgeVariant(download.state)}>
                          {download.state}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {download.url}
                      </p>
                      
                      {download.state === 'progressing' && (
                        <div className="space-y-1">
                          <Progress value={getProgress(download)} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {formatFileSize(download.receivedBytes)} / {formatFileSize(download.totalBytes)}
                            </span>
                            <span>{getProgress(download).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                      
                      {download.state === 'completed' && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatFileSize(download.totalBytes)}</span>
                          <span>
                            Completed {formatDistanceToNow(new Date(download.endTime || download.startTime))} ago
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {download.state === 'completed' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDownload(download.id)}
                            title="Open file"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowInFolder(download.id)}
                            title="Show in folder"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDownload(download.id)}
                        title="Remove from list"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
