import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { apiClient } from '../../../lib/api';
import { Button } from '../../../components/ui/button';

type UploadResponse = {
    secure_url: string;
};

type CourseImageUploadProps = {
    value?: string | null;
    onChange: (url: string | null) => void;
};

export function CourseImageUpload({ value, onChange }: CourseImageUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const uploadMutation = useMutation<UploadResponse, unknown, File>({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            const { data } = await apiClient.post<UploadResponse>('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return data;
        },
        onSuccess: (data) => {
            setUploadError(null);
            onChange(data.secure_url);
        },
        onError: (error) => {
            let message = 'Unable to upload file. Please try again.';

            if (error instanceof AxiosError) {
                const responseMessage = (error.response?.data as { message?: string; error?: string })?.message;
                const fallbackMessage = (error.response?.data as { message?: string; error?: string })?.error;
                message = responseMessage ?? fallbackMessage ?? error.message ?? message;
            } else if (error instanceof Error) {
                message = error.message;
            }

            setUploadError(message);
        },
    });

    const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploadError(null);
        uploadMutation.mutate(file);
        event.target.value = '';
    };

    const handleTriggerUpload = () => {
        inputRef.current?.click();
    };

    const handleRemoveImage = () => {
        onChange(null);
        setUploadError(null);
    };

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelectFile}
            />

            {value ? (
                <div className="space-y-3">
                    <img
                        src={value}
                        alt="Course thumbnail"
                        className="h-40 w-full rounded-md border border-zinc-200 object-cover"
                    />
                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleTriggerUpload}
                            disabled={uploadMutation.isPending}
                        >
                            Change image
                        </Button>
                        <Button type="button" variant="ghost" onClick={handleRemoveImage}>
                            Delete image
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleTriggerUpload}
                    disabled={uploadMutation.isPending}
                >
                    Upload image from computer
                </Button>
            )}

            {uploadMutation.isPending && (
                <p className="text-xs text-zinc-500">Uploading file to Cloudinary...</p>
            )}

            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        </div>
    );
}

