import { Mail, Phone, MapPin, Send, MessageCircle, Clock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState } from 'react';
import { showSuccessAlert } from '../lib/sweetalert';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const contactInfo = [
        {
            icon: Mail,
            title: 'Email',
            content: 'support@elearning.vn',
            description: 'Gửi email cho chúng tôi bất cứ lúc nào'
        },
        {
            icon: Phone,
            title: 'Điện thoại',
            content: '1900 1234',
            description: 'Thứ 2 - Thứ 6: 8:00 - 18:00'
        },
        {
            icon: MapPin,
            title: 'Địa chỉ',
            content: '123 Đường ABC, Quận 1',
            description: 'TP. Hồ Chí Minh, Việt Nam'
        },
        {
            icon: Clock,
            title: 'Giờ làm việc',
            content: '8:00 - 18:00',
            description: 'Thứ 2 - Thứ 6 (trừ ngày lễ)'
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(async () => {
            setIsSubmitting(false);
            await showSuccessAlert(
                'Gửi thành công!',
                'Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi sớm nhất có thể.'
            );
            setFormData({ name: '', email: '', subject: '', message: '' });
        }, 1500);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-black dark:from-red-900 dark:via-black dark:to-gray-950">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMS4xMDUuODk1LTIgMi0yczIgLjg5NSAyIDItLjg5NSAyLTIgMi0yLS44OTUtMi0yem0wIDQwYzAtMS4xMDUuODk1LTIgMi0yczIgLjg5NSAyIDItLjg5NSAyLTIgMi0yLS44OTUtMi0yem0tMTYtMjBjMC0xLjEwNS44OTUtMiAyLTJzMiAuODk1IDIgMi0uODk1IDItMiAyLTItLjg5NS0yLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
                
                <div className="relative container mx-auto px-4 py-20 md:py-32">
                    <div className="max-w-4xl mx-auto text-center space-y-6">
                        <div className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium border border-white/20">
                            Liên hệ với chúng tôi
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                            Chúng tôi luôn sẵn sàng
                            <span className="block bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                                lắng nghe bạn
                            </span>
                        </h1>
                        
                        <p className="text-lg md:text-xl text-red-100 max-w-2xl mx-auto">
                            Có câu hỏi? Cần hỗ trợ? Đừng ngần ngại liên hệ với chúng tôi. 
                            Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ bạn.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Info Cards */}
            <section className="py-20 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            {contactInfo.map((info, index) => (
                                <Card key={index} className="p-6 text-center hover:shadow-xl hover:shadow-red-500/10 transition-all border-gray-200 dark:border-gray-800 group">
                                    <div className="flex justify-center mb-4">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                                            <info.icon className="h-8 w-8" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {info.title}
                                    </h3>
                                    <p className="text-red-600 dark:text-red-400 font-medium mb-1">
                                        {info.content}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {info.description}
                                    </p>
                                </Card>
                            ))}
                        </div>

                        {/* Contact Form */}
                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Form */}
                            <Card className="p-8 border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white">
                                        <MessageCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            Gửi tin nhắn
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Điền form bên dưới
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Họ và tên
                                        </label>
                                        <Input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Nguyễn Văn A"
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Email
                                        </label>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="email@example.com"
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Tiêu đề
                                        </label>
                                        <Input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            placeholder="Tiêu đề tin nhắn"
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Nội dung
                                        </label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Nội dung tin nhắn của bạn..."
                                            required
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 resize-none"
                                        ></textarea>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg shadow-red-500/30"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                Đang gửi...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-5 w-5" />
                                                Gửi tin nhắn
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </Card>

                            {/* Map Placeholder */}
                            <div className="space-y-6">
                                <Card className="p-8 border-gray-200 dark:border-gray-800">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                        Văn phòng chính
                                    </h3>
                                    <div className="aspect-square rounded-xl bg-gradient-to-br from-red-100 to-gray-100 dark:from-red-950/20 dark:to-gray-900 flex items-center justify-center mb-6">
                                        <div className="text-center">
                                            <MapPin className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
                                            <p className="text-gray-600 dark:text-gray-400">Map Location</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-gray-600 dark:text-gray-400">
                                            <strong className="text-gray-900 dark:text-white">Địa chỉ:</strong><br />
                                            123 Đường ABC, Phường XYZ<br />
                                            Quận 1, TP. Hồ Chí Minh
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            <strong className="text-gray-900 dark:text-white">Giờ làm việc:</strong><br />
                                            Thứ 2 - Thứ 6: 8:00 - 18:00<br />
                                            Thứ 7: 8:00 - 12:00<br />
                                            Chủ nhật: Nghỉ
                                        </p>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

