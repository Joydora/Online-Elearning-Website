import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import { useAuthStore, type Role } from './stores/useAuthStore';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Chatbot } from './components/Chatbot';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import CourseDetail from './pages/CourseDetail';
import Dashboard from './pages/teacher/Dashboard';
import CreateCourse from './pages/teacher/CreateCourse';
import EditCourse from './pages/teacher/EditCourse';
import ManageCourse from './pages/teacher/ManageCourse';
import ManageQuiz from './pages/teacher/ManageQuiz';
import CoursePlayer from './pages/learning/CoursePlayer';
import ProgressPage from './pages/learning/Progress';
import AdminDashboard from './pages/admin/Dashboard';
import ManageCategories from './pages/admin/ManageCategories';
import ManageUsers from './pages/admin/ManageUsers';
import ManageCourses from './pages/admin/ManageCourses';
import AdminCreateCourse from './pages/admin/CreateCourse';
import AdminEditCourse from './pages/admin/EditCourse';
import AdminRevenue from './pages/admin/Revenue';
import LearningPath from './pages/LearningPath';

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
                path: '/courses',
                element: <Courses />,
            },
            {
                path: '/login',
                element: <Login />,
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
                path: '/learning-path',
                element: <LearningPath />,
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
                        element: <ProgressPage />,
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
                        path: '/admin/revenue',
                        element: <AdminRevenue />,
                    },
                ],
            },
        ],
    },
]);
