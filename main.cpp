#include <iostream>
#include <vector>
#include <string>
#include <fstream>

using namespace std;

class Schedule {
public:
    string title;
    string date;
    string dday;

    Schedule(string t, string d, string dd) {
        title = t;
        date = d;
        dday = dd;
    }

    void printInfo() const {
        cout << " [ " << dday << " ] " << title << " (마감일: " << date << ")\n";
    }

    string toFileString() const {
        return title + " " + date + " " + dday;
    }
};

void printMenu() {
    cout << "\n=========================================\n";
    cout << "     대학생 일정 및 과제 관리 프로그램     \n";
    cout << "=========================================\n";
    cout << "1. 새로운 일정 추가하기\n";
    cout << "2. 전체 일정 조회하기\n";
    cout << "3. 일정 파일로 저장하기\n";
    cout << "4. 프로그램 종료\n";
    cout << "-----------------------------------------\n";
    cout << "메뉴를 선택하세요: ";
}

void addSchedule(vector<Schedule>& schedules) {
    string title, date, dday;

    cout << "일정 이름 입력 (띄어쓰기 없이): ";
    cin >> title;
    cout << "날짜 입력 (예: 11-14): ";
    cin >> date;
    cout << "디데이 입력 (예: D-3): ";
    cin >> dday;

    schedules.push_back(Schedule(title, date, dday));
    cout << "일정이 성공적으로 등록되었습니다!\n";
}

void showSchedules(const vector<Schedule>& schedules) {
    cout << "\n--- [ 일정 목록 ] ---\n";
    if (schedules.empty()) {
        cout << "등록된 일정이 없습니다.\n";
        return;
    }

    for (size_t i = 0; i < schedules.size(); ++i) {
        cout << i + 1 << ". ";
        schedules[i].printInfo();
    }
    cout << "---------------------\n";
}

void saveToFile(const vector<Schedule>& schedules) {
    ofstream outFile("schedule.txt");
    if (outFile.is_open()) {
        for (const auto& s : schedules) {
            outFile << s.toFileString() << "\n";
        }
        outFile.close();
        cout << "파일에 안전하게 저장되었습니다!\n";
    }
    else {
        cout << "파일 저장 중 오류가 발생했습니다.\n";
    }
}

int main() {
    vector<Schedule> schedules;
    int choice;

    while (true) {
        printMenu();
        cin >> choice;

        if (cin.fail()) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "잘못된 입력입니다. 숫자를 입력해주세요.\n";
            continue;
        }

        switch (choice) {
        case 1:
            addSchedule(schedules);
            break;
        case 2:
            showSchedules(schedules);
            break;
        case 3:
            saveToFile(schedules);
            break;
        case 4:
            cout << "프로그램을 종료합니다.\n";
            return 0;
        default:
            cout << "존재하지 않는 메뉴입니다.\n";
        }
    }

    return 0;
}
