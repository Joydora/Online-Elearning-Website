import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { useAuthStore, type Role } from './stores/useAuthStore';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Chatbot } from './components/Chatbot';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import VerifyEmail from './pages/VerifyEmail';
import ResendVerification from './pages/ResendVerification';
import TeacherProfile from './pages/TeacherProfile';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';
import Register from './pages/Register';
import CourseDetail from './pages/CourseDetail';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import MyCourses from './pages/MyCourses';
import QuizHistory from './pages/QuizHistory';
import GoogleCallback from './pages/GoogleCallback';
import Dashboard from './pages/teacher/Dashboard';
import CreateCourse from './pages/teacher/CreateCourse';
import EditCourse from './pages/teacher/EditCourse';
import ManageCourse from './pages/teacher/ManageCourse';
import ManageQuiz from './pages/teacher/ManageQuiz';
import EnrolledStudents from './pages/teacher/EnrolledStudents';
import StudentPerformance from './pages/teacher/StudentPerformance';
import CoursePlayer from './pages/learning/CoursePlayer';
import AdminDashboard from './pages/admin/Dashboard';
import ManageCategories from './pages/admin/ManageCategories';
import ManageUsers from './pages/admin/ManageUsers';
import ManageCourses from './pages/admin/ManageCourses';
import AdminCreateCourse from './pages/admin/CreateCourse';
import AdminEditCourse from './pages/admin/EditCourse';
import ManagePromotions from './pages/admin/ManagePromotions';
import AdminRevenue from './pages/admin/Revenue';
import LearningPath from './pages/LearningPath';
import Progress from './pages/learning/Progress';
import Projects from './pages/learning/Projects';
import ManageProjects from './pages/teacher/ManageProjects';
import SyllabusImport from './pages/teacher/SyllabusImport';
import ReviewCourses from './pages/admin/ReviewCourses';

function MainLayout() {
    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <Chatbot />
        </div>
    );
}

type RoleRouteProps = {
    requiredRole: Role;
};

function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

function RoleRoute({ requiredRole }: RoleRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

export const router = createBrowserRouter([
    {
        element: <MainLayout />,
        children: [
            {
                path: '/',
                element: <Home />,
            },
            {
                path: '/about',
                element: <About />,
            },
            {
                path: '/contact',
                element: <Contact />,
            },
            {
                path: '/faq',
                element: <FAQ />,
            },
            {
                path: '/terms',
                element: <Terms />,
            },
            {
                path: '/privacy',
                element: <Privacy />,
            },
            {
                path: '/support',
                element: <Support />,
            },
            {
                path: '/courses',
                element: <Courses />,
            },
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/forgot-password',
                element: <ForgotPassword />,
            },
            {
                path: '/reset-password',
                element: <ResetPassword />,
            },
            {
                path: '/verify-email',
                element: <VerifyEmail />,
            },
            {
                path: '/resend-verification',
                element: <ResendVerification />,
            },
            {
                path: '/register',
                element: <Register />,
            },
            {
                path: '/courses/:id',
                element: <CourseDetail />,
            },
            {
                path: '/teachers/:id',
                element: <TeacherProfile />,
            },
            {
                path: '/payment-success',
                element: <PaymentSuccess />,
            },
            {
                path: '/payment-cancel',
                element: <PaymentCancel />,
            },
            {
                path: '/learning-path',
                element: <LearningPath />,
            },
            {
                path: '/auth/google/callback',
                element: <GoogleCallback />,
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: '/profile',
                        element: <Profile />,
                    },
                ],
            },
            {
                element: <RoleRoute requiredRole="STUDENT" />,
                children: [
                    {
                        path: '/learning/:courseId',
                        element: <CoursePlayer />,
                    },
                    {
                        path: '/learning/:courseId/progress',
                        element: <Progress />,
                    },
                    {
                        path: '/learning/:courseId/projects',
                        element: <Projects />,
                    },
                    {
                        path: '/my-courses',
                        element: <MyCourses />,
                    },
                    {
                        path: '/quiz-history',
                        element: <QuizHistory />,
                    },
                ],
            },
            {
                element: <RoleRoute requiredRole="TEACHER" />,
                children: [
                    {
                        path: '/dashboard',
                        element: <Dashboard />,
                    },
                    {
                        path: '/courses/create',
                        element: <CreateCourse />,
                    },
                    {
                        path: '/courses/:id/edit',
                        element: <EditCourse />,
                    },
                    {
                        path: '/courses/:id/manage',
                        element: <ManageCourse />,
                    },
                    {
                        path: '/quiz/:contentId/manage',
                        element: <ManageQuiz />,
                    },
                    {
                        path: '/courses/:id/students',
                        element: <EnrolledStudents />,
                    },
                    {
                        path: '/courses/:id/students/:studentId/performance',
                        element: <StudentPerformance />,
                    },
                    {
                        path: '/courses/:id/projects',
                        element: <ManageProjects />,
                    },
                    {
                        path: '/courses/:courseId/syllabus',
                        element: <SyllabusImport />,
                    },
                ],
            },
            {
                element: <RoleRoute requiredRole="ADMIN" />,
                children: [
                    {
                        path: '/admin',
                        element: <AdminDashboard />,
                    },
                    {
                        path: '/admin/categories',
                        element: <ManageCategories />,
                    },
                    {
                        path: '/admin/users',
                        element: <ManageUsers />,
                    },
                    {
                        path: '/admin/courses',
                        element: <ManageCourses />,
                    },
                    {
                        path: '/admin/courses/create',
                        element: <AdminCreateCourse />,
                    },
                    {
                        path: '/admin/courses/:id/edit',
                        element: <AdminEditCourse />,
                    },
                    {
                        path: '/admin/courses/:id/manage',
                        element: <ManageCourse />,
                    },
                        {
                            path: '/admin/quiz/:contentId/manage',
                            element: <ManageQuiz />,
                        },
                        {
                            path: '/admin/promotions',
                            element: <ManagePromotions />,
                        },
                        {
                            path: '/admin/revenue',
                            element: <AdminRevenue />,
                        },
                        {
                            path: '/admin/courses/review',
                            element: <ReviewCourses />,
                        },
                ],
            },
        ],
    },
]);
