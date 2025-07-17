import React, { useState, useEffect } from "react";
import styles from "./file-viewer.module.css";

const TrashIcon = () => (
  <svg
    className={styles.fileDeleteIcon}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 12 12"
    height="12"
    width="12"
    fill="#353740"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="..." // omitted for brevity
    />
  </svg>
);

type AssistantFile = {
  file_id: string;
  filename: string;
  status: string;
};

const FileViewer: React.FC = () => {
  const [files, setFiles] = useState<AssistantFile[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchFiles();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchFiles = async () => {
    const resp = await fetch("/api/assistants/files", {
      method: "GET",
    });
    const data = await resp.json();
    setFiles(data);
  };

  const handleFileDelete = async (fileId: string) => {
    await fetch("/api/assistants/files", {
      method: "DELETE",
      body: JSON.stringify({ fileId }),
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const data = new FormData();
    if (event.target.files && event.target.files.length > 0) {
      data.append("file", event.target.files[0]);
      await fetch("/api/assistants/files", {
        method: "POST",
        body: data,
      });
    }
  };

  return (
    <div className={styles.fileViewer}>
      <div
        className={`${styles.filesList} ${
          files.length !== 0 ? styles.grow : ""
        }`}
      >
        {files.length === 0 ? (
          <div className={styles.title}>Attach files to test file search</div>
        ) : (
          files.map((file) => (
            <div key={file.file_id} className={styles.fileEntry}>
              <div className={styles.fileName}>
                <span className={styles.fileName}>{file.filename}</span>
                <span className={styles.fileStatus}>{file.status}</span>
              </div>
              <span onClick={() => handleFileDelete(file.file_id)}>
                <TrashIcon />
              </span>
            </div>
          ))
        )}
      </div>
      <div className={styles.fileUploadContainer}>
        <label htmlFor="file-upload" className={styles.fileUploadBtn}>
          Attach files
        </label>
        <input
          type="file"
          id="file-upload"
          name="file-upload"
          className={styles.fileUploadInput}
          multiple
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};

export default FileViewer;
